import { useCallback, useState } from 'react'
import { ApiError } from '../api/client'
import type { UploadProgress } from '../api/upload'
import { rejectionDetail } from '../utils/apiError'

// The ONE upload cycle both file surfaces use (Е2, invariant #3): sequential
// send (one request per file, no concurrency), a file counter, the current
// file's bytes, per-file wake of the shell poll (Е9), failure collection, and a
// single tree re-read after the batch (point-1 cadence, ratified 2026-08-15).
// It writes nothing to the work-list store — that store's only writer is the
// poll (Д8); the cycle only wakes it.

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

  const run = useCallback(
    async (tasks: UploadTask[], hooks: UploadBatchHooks = {}): Promise<void> => {
      if (tasks.length === 0) return
      const failures: string[] = []
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
            failures.push(
              rejectionDetail(err) ??
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
      // Rejections stay in the browser modal (replacement is DD-2.2-AG).
      if (failures.length > 0) alert(failures.join('\n'))
    },
    [],
  )

  return { state, run }
}
