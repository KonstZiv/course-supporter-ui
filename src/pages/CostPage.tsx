import { SpendingFrame } from '../components/cost/SpendingFrame'
import type {
  BillingSpendingResponse,
  BillingSpendingUnits,
} from '../types/api'
import { monthLabel, type Month } from '../utils/spendingPeriod'
import { formatNumber, formatUnits } from '../utils/units'

// "Витрати": what the author's actions cost them in units, by course, for a
// month (`GET /billing/spending`). Units only — the author never sees what
// model calls cost (product owner's decision). While the platform charges no
// units the page says so, as before.

export const UNTITLED_COURSE = 'Курс без назви'

const hasAny = (u: BillingSpendingUnits) =>
  u.billed_units !== 0 || u.covered_units !== 0

const CELL = 'px-3 py-2 text-end tabular-nums whitespace-nowrap'
const HEAD = 'px-3 py-2 text-end font-medium whitespace-nowrap'

function CourseTable({ spending }: { spending: BillingSpendingResponse }) {
  const unlinked = hasAny(spending.unlinked) ? spending.unlinked : null
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm text-ink">
        <thead className="bg-canvas-dark/40 text-ink-light">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              Курс
            </th>
            <th scope="col" className={HEAD}>Обробка матеріалів</th>
            <th scope="col" className={HEAD}>Підготовка завдань</th>
            <th scope="col" className={HEAD}>Перевірки робіт</th>
            <th scope="col" className={HEAD}>Разом витрачено</th>
            <th scope="col" className={HEAD}>Покрито</th>
          </tr>
        </thead>
        <tbody>
          {spending.courses.map((course) => (
            <tr key={course.course_node_id} className="border-t border-canvas-dark/40">
              <th scope="row" className="px-3 py-2 text-start font-normal">
                {course.title ?? UNTITLED_COURSE}
              </th>
              <td className={CELL}>{formatNumber('uk', course.processing_units)}</td>
              <td className={CELL}>{formatNumber('uk', course.preparation_units)}</td>
              <td className={CELL}>{formatNumber('uk', course.reviews_units)}</td>
              <td className={CELL}>{formatNumber('uk', course.billed_units)}</td>
              <td className={CELL}>{formatNumber('uk', course.covered_units)}</td>
            </tr>
          ))}
          {unlinked && (
            <tr className="border-t border-canvas-dark/40">
              <th scope="row" className="px-3 py-2 text-start font-normal">
                Без курсу
              </th>
              <td className={CELL}>—</td>
              <td className={CELL}>—</td>
              <td className={CELL}>—</td>
              <td className={CELL}>{formatNumber('uk', unlinked.billed_units)}</td>
              <td className={CELL}>{formatNumber('uk', unlinked.covered_units)}</td>
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
  if (spending.courses.length === 0 && !hasAny(spending.unlinked)) {
    return <p className="text-ink">За цей місяць витрат немає.</p>
  }
  const { billed_units: billed, covered_units: covered } = spending.totals
  return (
    <div className="space-y-4">
      <div className="space-y-1 text-ink">
        <p className="text-lg font-semibold">
          Витрачено за {monthLabel(month)}: {formatUnits('uk', billed)}.
        </p>
        {covered > 0 && (
          <p>Покрито платформою або за домовленістю: {formatUnits('uk', covered)}.</p>
        )}
      </div>
      <CourseTable spending={spending} />
    </div>
  )
}

export function CostPage() {
  return (
    <SpendingFrame
      title="Витрати"
      idle={
        <p className="text-ink">
          Тут будуть ваші витрати в юнітах на обробку матеріалів — з розбивкою по
          курсах. Вони з'являться, щойно платформа почне списувати юніти. Зараз
          юніти не списуються.
        </p>
      }
    >
      {(spending, month) => <MonthSpending spending={spending} month={month} />}
    </SpendingFrame>
  )
}
