import { useCallback, useState } from 'react'
import { ApiError } from '../api/client'
import type { UploadProgress } from '../api/upload'
import { authoredRejectionMessage } from '../utils/apiError'

// The ONE upload cycle both file surfaces use (Е2, invariant #3): sequential
// send (one request per file, no concurrency), a file counter, the current
// file's bytes, per-file wake of the shell poll (Е9), failure collection, and a
// single tree re-read after the batch (point-1 cadence, ratified 2026-08-15).
// It writes nothing to the work-list store — that store's only writer is the
// poll (Д8); the cycle only wakes it.
//
// Failures are state here rather than a browser modal (step Г2 §2.5, closing
// DD-2.2-AG). They are kept OUT of UploadBatchState on purpose: progress and
// failures have opposite lifetimes. Progress is transient and clears itself
// when the batch ends; a failure has to outlive the batch that produced it,
// because it is the only place the author will ever read why their file did
// not arrive. One state cannot be both, which is why the two are separate
// fields with separate components.

export interface UploadTask {
  /** File name, for the failure fallback text (Е8). */
  label: string
  /** Sends one file; the cycle feeds it the per-file progress callback. */
  send: (onProgress: (progress: UploadProgress) => void) => Promise<unknown>
}

export interface UploadBatchState {
  active: boolean
  /** 1-based index of the file being sent (0 when idle). */
  index: number
  /** Total files in the batch. */
  count: number
  /** Current file's bytes; null before its first progress tick. */
  bytes: UploadProgress | null
  /** Е5: the last byte is sent, the server's response is not yet in. */
  awaitingServer: boolean
}

const IDLE: UploadBatchState = {
  active: false,
  index: 0,
  count: 0,
  bytes: null,
  awaitingServer: false,
}

export interface UploadBatchHooks {
  /** Wake the shell poll after each successful file (Е9/Д10). */
  onFileQueued?: () => void
  /** Re-read the tree once after the whole batch (point-1 cadence). */
  onComplete?: () => Promise<void> | void
}

export function useUploadBatch() {
  const [state, setState] = useState<UploadBatchState>(IDLE)
  const [failures, setFailures] = useState<string[]>([])

  // Called at the START of a gesture with whatever the pre-send checks refused
  // (an empty array when they refused nothing). It REPLACES rather than
  // appends: a new drop is a new answer, and yesterday's refusals hanging над
  // today's upload would be read as today's.
  const reportFailures = useCallback((messages: string[]) => {
    setFailures(messages)
  }, [])

  // The author closes the notice. Never a timer: a refusal the reader has not
  // finished reading is the one thing that must not vanish on its own.
  const dismissFailures = useCallback(() => setFailures([]), [])

  const run = useCallback(
    async (tasks: UploadTask[], hooks: UploadBatchHooks = {}): Promise<void> => {
      if (tasks.length === 0) return
      const batchFailures: string[] = []
      setState({
        active: true,
        index: 1,
        count: tasks.length,
        bytes: null,
        awaitingServer: false,
      })
      try {
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i]!
          setState((s) => ({
            ...s,
            index: i + 1,
            bytes: null,
            awaitingServer: false,
          }))
          try {
            await task.send((progress) => {
              // Once the last byte is sent the server still reads and stores the
              // file — the bar would lie frozen at 100%, so it yields to words
              // (Е5). Until then it tracks the bytes.
              const done = progress.total > 0 && progress.loaded >= progress.total
              setState((s) => ({ ...s, bytes: progress, awaitingServer: done }))
            })
            hooks.onFileQueued?.() // Е9 — a visible row after the FIRST file, not the last
          } catch (err) {
            batchFailures.push(
              authoredRejectionMessage(err) ??
                `${task.label}: не вдалося надіслати файл (код ${
                  err instanceof ApiError ? err.status : 'unknown'
                })`,
            )
          }
        }
      } finally {
        await hooks.onComplete?.()
        setState(IDLE)
      }
      // APPENDED, not assigned: the gesture may already have reported files the
      // pre-send checks refused, and those are as much a part of "what happened
      // to my drop" as a server refusal is.
      if (batchFailures.length > 0) {
        setFailures((prev) => [...prev, ...batchFailures])
      }
    },
    [],
  )

  return { state, run, failures, reportFailures, dismissFailures }
}
