import { SpendingFrame } from '../components/cost/SpendingFrame'
import type {
  BillingSpendingResponse,
  BillingSpendingUnits,
} from '../types/api'
import { monthLabel, type Month } from '../utils/spendingPeriod'
import { formatNumber, formatUnits } from '../utils/units'
import { useLanguage, useT } from '../i18n/LanguageContext'

// "Витрати": what the author's actions cost them in units, by course, for a
// month (`GET /billing/spending`). Units only — the author never sees what
// model calls cost (product owner's decision). While the platform charges no
// units the page says so, as before.

const hasAny = (u: BillingSpendingUnits) =>
  u.billed_units !== 0 || u.covered_units !== 0

const CELL = 'px-3 py-2 text-end tabular-nums whitespace-nowrap'
const HEAD = 'px-3 py-2 text-end font-medium whitespace-nowrap'

function CourseTable({ spending }: { spending: BillingSpendingResponse }) {
  const language = useLanguage()
  const t = useT()
  const unlinked = hasAny(spending.unlinked) ? spending.unlinked : null
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm text-ink">
        <thead className="bg-canvas-dark/40 text-ink-light">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t('panel.cost.table.course')}
            </th>
            <th scope="col" className={HEAD}>{t('panel.cost.table.documentProcessing')}</th>
            <th scope="col" className={HEAD}>{t('panel.cost.table.taskPreparation')}</th>
            <th scope="col" className={HEAD}>{t('panel.cost.table.reviewing')}</th>
            <th scope="col" className={HEAD}>{t('panel.cost.table.totalSpent')}</th>
            <th scope="col" className={HEAD}>{t('panel.cost.table.covered')}</th>
          </tr>
        </thead>
        <tbody>
          {spending.courses.map((course) => (
            <tr key={course.course_node_id} className="border-t border-canvas-dark/40">
              <th scope="row" className="px-3 py-2 text-start font-normal">
                {course.title ?? t('panel.cost.untitledCourse')}
              </th>
              <td className={CELL}>{formatNumber(language, course.processing_units)}</td>
              <td className={CELL}>{formatNumber(language, course.preparation_units)}</td>
              <td className={CELL}>{formatNumber(language, course.reviews_units)}</td>
              <td className={CELL}>{formatNumber(language, course.billed_units)}</td>
              <td className={CELL}>{formatNumber(language, course.covered_units)}</td>
            </tr>
          ))}
          {unlinked && (
            <tr className="border-t border-canvas-dark/40">
              <th scope="row" className="px-3 py-2 text-start font-normal">
                {t('panel.cost.unlinkedCourse')}
              </th>
              <td className={CELL}>—</td>
              <td className={CELL}>—</td>
              <td className={CELL}>—</td>
              <td className={CELL}>{formatNumber(language, unlinked.billed_units)}</td>
              <td className={CELL}>{formatNumber(language, unlinked.covered_units)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function MonthSpending({
  spending,
  month,
}: {
  spending: BillingSpendingResponse
  month: Month
}) {
  const language = useLanguage()
  const t = useT()

  if (spending.courses.length === 0 && !hasAny(spending.unlinked)) {
    return <p className="text-ink">{t('panel.cost.emptyMonth')}</p>
  }
  const { billed_units: billed, covered_units: covered } = spending.totals
  return (
    <div className="space-y-4">
      <div className="space-y-1 text-ink">
        <p className="text-lg font-semibold">
          {t('panel.cost.spentInMonth', {
            month: monthLabel(month, language),
            units: formatUnits(language, billed),
          })}
        </p>
        {covered > 0 && (
          <p>{t('panel.cost.covered', { units: formatUnits(language, covered) })}</p>
        )}
      </div>
      <CourseTable spending={spending} />
    </div>
  )
}

export function CostPage() {
  const t = useT()

  return (
    <SpendingFrame
      title={t('panel.cost.title')}
      idle={
        <p className="text-ink">
          {t('panel.cost.idle')}
        </p>
      }
    >
      {(spending, month) => <MonthSpending spending={spending} month={month} />}
    </SpendingFrame>
  )
}
