import { useEffect, useRef } from 'react'

/**
 * Poll a function at an interval until stopped.
 */
export function usePolling(
  fn: () => Promise<boolean>, // return true to stop
  intervalMs: number,
  enabled: boolean,
) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return

    let timer: ReturnType<typeof setTimeout>
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const done = await fnRef.current()
        if (done || cancelled) return
      } catch {
        // continue polling on error
      }
      if (!cancelled) {
        timer = setTimeout(tick, intervalMs)
      }
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [intervalMs, enabled])
}
