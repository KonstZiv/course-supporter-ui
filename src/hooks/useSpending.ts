import { useEffect, useState } from 'react'
import { billingSpending } from '../api/billing'
import type { BillingSpendingResponse } from '../types/api'
import { monthBounds, type Month } from '../utils/spendingPeriod'

export type SpendingState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; spending: BillingSpendingResponse }

/** The author's spending in units of one month (UTC days, both included). */
export function useSpending(month: Month): SpendingState {
  const [state, setState] = useState<SpendingState>({ status: 'loading' })
  const { year, month: index } = month

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    const { from, to } = monthBounds({ year, month: index })
    billingSpending(from, to).then(
      (spending) => {
        if (!cancelled) setState({ status: 'loaded', spending })
      },
      () => {
        if (!cancelled) setState({ status: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [year, index])

  return state
}
