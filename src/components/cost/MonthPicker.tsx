import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  isAfter,
  monthLabel,
  shiftMonth,
  type Month,
} from '../../utils/spendingPeriod'
import { useT } from '../../i18n/LanguageContext'

/** "‹ листопад 2026 ›": the month of the spending; none after the current one. */
export function MonthPicker({
  month,
  current,
  onChange,
}: {
  month: Month
  /** The current month: the next one is not offered after it. */
  current: Month
  onChange: (month: Month) => void
}) {
  const next = shiftMonth(month, 1)
  const t = useT()

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className="btn-ghost btn-sm"
        aria-label={t('panel.cost.monthPicker.previous')}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-ink font-medium min-w-[9rem] text-center" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        className="btn-ghost btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={t('panel.cost.monthPicker.next')}
        disabled={isAfter(next, current)}
        onClick={() => onChange(next)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
