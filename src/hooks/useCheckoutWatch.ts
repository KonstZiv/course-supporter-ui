import { useCallback, useEffect, useState } from 'react'
import type { BillingCheckoutStateResponse } from '../types/api'
import {
  nextPollDelay,
  pollStage,
  type PollStage,
} from '../utils/billingPolling'

export type CheckoutWatch =
  /** No answer yet. */
  | { status: 'checking' }
  | { status: 'pending'; stage: PollStage }
  | { status: 'credited'; units: number; balanceAfter: number | null }
  | { status: 'failed' }
  /** Not a checkout of the holder's (404 `checkout_not_found`). */
  | { status: 'unknown' }

/**
 * Where the holder's checkouts are asked about: the author's client or the
 * portal's. A module-level constant, so the watch does not start over on
 * every render.
 */
export interface CheckoutSource {
  getCheckout: (checkoutRef: string) => Promise<BillingCheckoutStateResponse>
  /** The reason code of a failed ask (`detail.code`), or null. */
  reasonOf: (err: unknown) => string | null
}

/**
 * The state of the checkout the holder (the author, the student) came back
 * from, asked through `source` on the schedule of `utils/billingPolling`
 * until it is credited or failed, or the time is up. A failed ask (no
 * connection, a server error) waits for the next one. `retry` starts the
 * schedule over.
 */
export function useCheckoutWatch(
  checkoutRef: string,
  source: CheckoutSource,
): {
  watch: CheckoutWatch
  retry: () => void
} {
  const [watch, setWatch] = useState<CheckoutWatch>({ status: 'checking' })
  const [round, setRound] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = Date.now()

    const ask = async () => {
      try {
        const answer = await source.getCheckout(checkoutRef)
        if (cancelled) return
        // Credited carries its units; an answer without them is asked again.
        if (answer.state === 'credited' && answer.units !== null) {
          setWatch({
            status: 'credited',
            units: answer.units,
            balanceAfter: answer.balance_after,
          })
          return
        }
        if (answer.state === 'failed') {
          setWatch({ status: 'failed' })
          return
        }
      } catch (err) {
        if (cancelled) return
        if (source.reasonOf(err) === 'checkout_not_found') {
          setWatch({ status: 'unknown' })
          return
        }
      }
      const elapsed = Date.now() - started
      setWatch({ status: 'pending', stage: pollStage(elapsed) })
      const delay = nextPollDelay(elapsed)
      if (delay !== null) timer = setTimeout(() => void ask(), delay)
    }

    void ask()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [checkoutRef, source, round])

  const retry = useCallback(() => {
    setWatch({ status: 'pending', stage: 'first-minute' })
    setRound((r) => r + 1)
  }, [])

  return { watch, retry }
}
