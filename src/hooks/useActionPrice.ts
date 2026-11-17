import { useCallback, useEffect, useRef, useState } from 'react'
import type { AuthorEstimateResponse } from '../types/api'
import {
  batchPriceView,
  type EstimateOutcome,
  type PriceView,
} from '../utils/priceEstimate'

/** One estimate of a paid action, asked again on each re-check. */
export interface PriceRequest {
  estimate: () => Promise<AuthorEstimateResponse>
  /** The features the material's kind needs are in the request. */
  priced: boolean
}

export interface ActionPrice {
  view: PriceView
  /** It was short, and a re-check after the purchase found enough. */
  recovered: boolean
  /** The action may start: the answer is in and it is not short. */
  ready: boolean
}

const PENDING: PriceView = { kind: 'pending' }
const NOTHING: PriceView = { kind: 'none' }

/** While the "not enough" panel is shown: how often the price is asked again. */
export const RECHECK_MS = 10_000

async function outcomesOf(
  requests: readonly PriceRequest[],
): Promise<EstimateOutcome[]> {
  const settled = await Promise.allSettled(requests.map((r) => r.estimate()))
  return settled.map((result, i) =>
    result.status === 'fulfilled'
      ? { status: 'answered', answer: result.value, priced: requests[i]!.priced }
      : { status: 'failed' },
  )
}

/**
 * The price of a paid action before it starts. `requests` — one per file of a
 * batch, one for a single action; null while they are being prepared (the
 * features of a file are still read). Keep it stable between renders: a new
 * list is a new question.
 *
 * While the answer says "not enough", the price is asked again — when the tab
 * comes back into view and every ten seconds while it is in view — with the
 * same requests (a file is not read or sent again), so a purchase made in
 * another tab opens the action here.
 */
export function useActionPrice(
  requests: readonly PriceRequest[] | null,
): ActionPrice {
  // Nothing to price (nothing paid in the action): nothing to wait for either.
  const [view, setView] = useState<PriceView>(() =>
    requests !== null && requests.length === 0 ? NOTHING : PENDING,
  )
  const [recovered, setRecovered] = useState(false)
  // Only the latest question's answer counts.
  const asked = useRef(0)

  const ask = useCallback(
    async (list: readonly PriceRequest[], recheck: boolean) => {
      const mine = ++asked.current
      const next = batchPriceView(await outcomesOf(list))
      if (mine !== asked.current) return
      if (recheck) {
        // A failed re-check keeps the panel; the next one asks again.
        if (next.kind === 'failed') return
        if (next.kind !== 'short') setRecovered(true)
      }
      setView(next)
    },
    [],
  )

  useEffect(() => {
    setRecovered(false)
    if (requests === null || requests.length === 0) {
      asked.current += 1
      setView(requests === null ? PENDING : NOTHING)
      return
    }
    setView(PENDING)
    void ask(requests, false)
    return () => {
      asked.current += 1
    }
  }, [requests, ask])

  const short = view.kind === 'short'
  useEffect(() => {
    if (!short || requests === null) return
    const recheck = () => {
      if (document.visibilityState === 'visible') void ask(requests, true)
    }
    const timer = setInterval(recheck, RECHECK_MS)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [short, requests, ask])

  return {
    view,
    recovered,
    ready: view.kind !== 'pending' && view.kind !== 'short',
  }
}
