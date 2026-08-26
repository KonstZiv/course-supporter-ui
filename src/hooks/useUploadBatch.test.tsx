import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUploadBatch, type UploadTask } from './useUploadBatch'
import { ApiError } from '../api/client'
import type { UploadProgress } from '../api/upload'

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useUploadBatch (the one upload cycle, Е2/Е9)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sends files in order, counts each, wakes per success, re-reads once', async () => {
    const started: string[] = []
    const d0 = deferred<unknown>()
    const d1 = deferred<unknown>()
    const tasks: UploadTask[] = [
      {
        label: 'a',
        send: () => {
          started.push('a')
          return d0.promise
        },
      },
      {
        label: 'b',
        send: () => {
          started.push('b')
          return d1.promise
        },
      },
    ]
    const onFileQueued = vi.fn()
    const onComplete = vi.fn()
    const { result } = renderHook(() => useUploadBatch())

    let run!: Promise<void>
    await act(async () => {
      run = result.current.run(tasks, { onFileQueued, onComplete })
    })
    // First file sending; the second has NOT started (sequential, one at a time).
    expect(result.current.state).toMatchObject({ active: true, index: 1, count: 2 })
    expect(started).toEqual(['a'])
    expect(onFileQueued).not.toHaveBeenCalled()

    await act(async () => {
      d0.resolve(undefined)
      await Promise.resolve()
    })
    expect(started).toEqual(['a', 'b'])
    expect(result.current.state.index).toBe(2)
    expect(onFileQueued).toHaveBeenCalledTimes(1) // woke after the FIRST file

    await act(async () => {
      d1.resolve(undefined)
      await run
    })
    expect(onFileQueued).toHaveBeenCalledTimes(2)
    expect(onComplete).toHaveBeenCalledTimes(1) // tree re-read once, after the batch
    expect(result.current.state.active).toBe(false)
  })

  it('bytes track progress, then yield to words at 100% (Е5)', async () => {
    const d = deferred<unknown>()
    let emit!: (p: UploadProgress) => void
    const tasks: UploadTask[] = [
      {
        label: 'big.mp4',
        send: (onProgress) => {
          emit = onProgress
          return d.promise
        },
      },
    ]
    const { result } = renderHook(() => useUploadBatch())
    let run!: Promise<void>
    await act(async () => {
      run = result.current.run(tasks)
    })

    await act(async () => emit({ loaded: 50, total: 100 }))
    expect(result.current.state.bytes).toEqual({ loaded: 50, total: 100 })
    expect(result.current.state.awaitingServer).toBe(false)

    await act(async () => emit({ loaded: 100, total: 100 }))
    expect(result.current.state.awaitingServer).toBe(true) // Е5 — words take over

    await act(async () => {
      d.resolve(undefined)
      await run
    })
    expect(result.current.state.active).toBe(false)
  })

  it('collects a failure, continues the batch, alerts the human reason', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onFileQueued = vi.fn()
    const tasks: UploadTask[] = [
      {
        label: 'bad.mp4',
        send: () =>
          Promise.reject(
            // A real Stage-1 reject carries { code, category, details }; the
            // author sees the human dictionary text, never the raw ``details``
            // (DD-SP-D). Every production rejection carries a code.
            new ApiError(400, 'x', {
              detail: {
                code: 'SECURITY_REJECTED',
                category: 'size_limit',
                details: 'file size 6000000000 bytes exceeds cap',
              },
            }),
          ),
      },
      { label: 'good.mp4', send: () => Promise.resolve({}) },
    ]
    const { result } = renderHook(() => useUploadBatch())
    await act(async () => {
      await result.current.run(tasks, { onFileQueued })
    })
    // bad rejected → NOT woken; good succeeded → woken once (batch continued).
    expect(onFileQueued).toHaveBeenCalledTimes(1)
    expect(alertSpy).toHaveBeenCalledWith(
      'Файл завеликий. Зменште його або розділіть на частини.',
    )
    expect(result.current.state.active).toBe(false)
  })

  it('falls back to product-language text when no reason is given (Е8)', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const tasks: UploadTask[] = [
      { label: 'x.mp4', send: () => Promise.reject(new ApiError(500, 'x', null)) },
    ]
    const { result } = renderHook(() => useUploadBatch())
    await act(async () => {
      await result.current.run(tasks)
    })
    expect(alertSpy).toHaveBeenCalledWith(
      'x.mp4: не вдалося надіслати файл (код 500)',
    )
  })
})
