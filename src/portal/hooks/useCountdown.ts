import { useCallback, useEffect, useState } from 'react'

/**
 * Seconds left until a moment, counted down once a second: `[left, start]`,
 * where `start(seconds)` sets a new moment that many seconds from now. Counted
 * from the clock, not by ticks, so a tab the browser slowed down still ends
 * on time.
 */
export function useCountdown(initialSeconds: number): [number, (seconds: number) => void] {
  const [deadline, setDeadline] = useState(() => Date.now() + initialSeconds * 1000)
  const [left, setLeft] = useState(() => Math.max(0, initialSeconds))

  useEffect(() => {
    const remaining = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (remaining() === 0) return
    const id = setInterval(() => {
      const now = remaining()
      setLeft(now)
      if (now === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [deadline])

  const start = useCallback((seconds: number) => {
    setDeadline(Date.now() + seconds * 1000)
    setLeft(Math.max(0, seconds))
  }, [])

  return [left, start]
}
