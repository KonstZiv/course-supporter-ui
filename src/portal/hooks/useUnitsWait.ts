import { useEffect, useRef } from 'react'
import { portalApi } from '../api/portalClient'

/** How often the units are looked at while the tab is in view. */
export const UNITS_POLL_MS = 10_000

/**
 * While the not-enough panel is up (``threshold`` not null): the student buys
 * units in another tab, and this one looks at what is available — when the tab
 * comes back into view, and every 10 s while it is in view. Once
 * ``available >= threshold``, ``onReached`` is called ONCE; until then nothing
 * else is asked, and the chosen file is not sent anywhere.
 *
 * A failed look is not an answer: the next one tries again.
 */
export function useUnitsWait(threshold: number | null, onReached: () => void) {
  const reached = useRef(onReached)
  useEffect(() => {
    reached.current = onReached
  }, [onReached])

  useEffect(() => {
    if (threshold === null) return
    let done = false
    let asking = false
    const look = () => {
      if (done || asking || document.visibilityState !== 'visible') return
      asking = true
      portalApi
        .billingBalance()
        .then((balance) => {
          if (done || balance.available < threshold) return
          done = true
          reached.current()
        })
        .catch(() => undefined)
        .finally(() => {
          asking = false
        })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') look()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const timer = setInterval(look, UNITS_POLL_MS)
    return () => {
      done = true
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(timer)
    }
  }, [threshold])
}
