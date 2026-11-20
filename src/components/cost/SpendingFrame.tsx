import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useSpending } from '../../hooks/useSpending'
import type { BillingSpendingResponse } from '../../types/api'
import { loadFailedText } from '../../utils/authorBillingTexts'
import { monthOf, type Month } from '../../utils/spendingPeriod'
import { ContactAdmin } from '../ui/ContactAdmin'
import { MonthPicker } from './MonthPicker'
import { useLanguage } from '../../i18n/LanguageContext'

/**
 * The frame of the two spending pages: the title, the month, and — once the
 * server answers — either the text for while units are not charged (`idle`)
 * or the page's own report of the month.
 */
export function SpendingFrame({
  title,
  idle,
  children,
}: {
  title: string
  /** What the page says while the platform charges no units. */
  idle: React.ReactNode
  children: (spending: BillingSpendingResponse, month: Month) => React.ReactNode
}) {
  const language = useLanguage()
  // The current month is read once per visit: a page left open over the turn
  // of a month keeps offering the month it opened in.
  const [current] = useState(() => monthOf(new Date()))
  const [month, setMonth] = useState(current)
  const state = useSpending(month)
  const charging =
    state.status === 'loaded' ? state.spending.charging_enabled : null

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">{title}</h1>
        {/* Nothing to choose between while every month is empty. */}
        {charging !== false && (
          <MonthPicker month={month} current={current} onChange={setMonth} />
        )}
      </div>

      {state.status === 'loading' && (
        <div className="flex justify-center py-6" aria-hidden>
          <Loader2 size={20} className="animate-spin text-ink-light" />
        </div>
      )}
      {state.status === 'failed' && (
        <div className="rounded-2xl bg-canvas-dark p-5 space-y-2">
          <p role="alert" className="text-ink">
            {loadFailedText(language)}
          </p>
          <ContactAdmin message={loadFailedText(language)} fallback="after-click" />
        </div>
      )}
      {state.status === 'loaded' &&
        (state.spending.charging_enabled ? (
          children(state.spending, month)
        ) : (
          <div className="card p-6">{idle}</div>
        ))}
    </div>
  )
}
