import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { billingStudentsMoney } from '../api/billing'
import { MonthPicker } from '../components/cost/MonthPicker'
import type {
  BillingMoneyAmount,
  BillingMoneyCourse,
  BillingMoneyFigures,
  BillingMoneyStudent,
  BillingStudentsMoneyResponse,
} from '../types/api'
import { useLanguage, useT } from '../i18n/LanguageContext'
import type { Language } from '../i18n/languages'
import { monthBounds, monthLabel, monthOf } from '../utils/spendingPeriod'
import { formatMoneyAmount, formatNumber, formatUnits } from '../utils/units'

const CELL = 'px-3 py-2 text-end tabular-nums whitespace-nowrap'
const HEAD = 'px-3 py-2 text-end font-medium whitespace-nowrap'

type LoadState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'loaded'; data: BillingStudentsMoneyResponse }

function formatMoneyInline(language: Language, money: BillingMoneyAmount[]): string {
  if (money.length === 0) return '—'
  return money
    .map((item) => formatMoneyAmount(language, item.currency, item.amount_minor))
    .join(', ')
}

function MoneyCell({ money }: { money: BillingMoneyAmount[] }) {
  const language = useLanguage()
  if (money.length === 0) {
    return <td className={CELL}>—</td>
  }
  return (
    <td className={CELL}>
      {money.map((item) => (
        <div key={item.currency}>
          {formatMoneyAmount(language, item.currency, item.amount_minor)}
        </div>
      ))}
    </td>
  )
}

function FigureCells({ figures }: { figures: BillingMoneyFigures }) {
  const language = useLanguage()
  return (
    <>
      <td className={CELL}>{formatNumber(language, figures.reviews)}</td>
      <td className={CELL}>{formatNumber(language, figures.units)}</td>
      <MoneyCell money={figures.money} />
      <td className={CELL}>{formatNumber(language, figures.gift_units)}</td>
    </>
  )
}

function StudentRows({ students }: { students: BillingMoneyStudent[] }) {
  const t = useT()
  return (
    <table className="w-full text-sm text-ink">
      <thead className="bg-canvas text-ink-muted">
        <tr>
          <th scope="col" className="px-3 py-2 ps-9 text-start font-medium">
            {t('panel.studentsMoney.table.student')}
          </th>
          <th scope="col" className={HEAD}>
            {t('panel.studentsMoney.table.reviews')}
          </th>
          <th scope="col" className={HEAD}>
            {t('panel.studentsMoney.table.units')}
          </th>
          <th scope="col" className={HEAD}>
            {t('panel.studentsMoney.table.money')}
          </th>
          <th scope="col" className={HEAD}>
            {t('panel.studentsMoney.table.giftUnits')}
          </th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => {
          const name =
            student.deleted || student.display_name === null
              ? t('panel.studentsMoney.deletedStudent')
              : student.display_name
          return (
            <tr key={student.student_id} className="border-t border-canvas-dark/40">
              <th scope="row" className="px-3 py-2 ps-9 text-start font-normal">
                {name}
              </th>
              <FigureCells figures={student} />
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CourseRow({
  course,
  expanded,
  onToggle,
}: {
  course: BillingMoneyCourse
  expanded: boolean
  onToggle: () => void
}) {
  const t = useT()
  const Chevron = expanded ? ChevronDown : ChevronRight
  const title = course.title ?? t('panel.cost.untitledCourse')

  return (
    <Fragment>
      <tr
        onClick={onToggle}
        className="border-t border-canvas-dark/40 hover:bg-canvas/60 cursor-pointer"
      >
        <th scope="row" className="px-3 py-2 text-start font-medium">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="inline-flex items-center gap-2 text-start font-medium text-ink"
          >
            <Chevron size={16} className="text-ink-light shrink-0" />
            <span>{title}</span>
          </button>
        </th>
        <FigureCells figures={course} />
      </tr>
      {expanded && (
        <tr className="border-t border-canvas-dark/40 bg-canvas/50">
          <td colSpan={5} className="p-0">
            <StudentRows students={course.students} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

const hasAny = (figures: BillingMoneyFigures) =>
  figures.reviews !== 0 || figures.units !== 0

/**
 * "Гроші студентів за перевірки": what students paid from their own packages
 * for reviews, ordered by units descending by course and by student.
 */
export function StudentsMoneyPage() {
  const language = useLanguage()
  const t = useT()
  const [current] = useState(() => monthOf(new Date()))
  const [month, setMonth] = useState(current)
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [reloadTick, setReloadTick] = useState(0)

  const { year, month: monthIndex } = month

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    setExpanded(new Set())
    const { from, to } = monthBounds({ year, month: monthIndex })
    billingStudentsMoney(from, to).then(
      (data) => {
        if (!cancelled) setState({ status: 'loaded', data })
      },
      () => {
        if (!cancelled) setState({ status: 'failed' })
      },
    )
    return () => {
      cancelled = true
    }
  }, [year, monthIndex, reloadTick])

  const toggleCourse = useCallback((courseNodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(courseNodeId)) next.delete(courseNodeId)
      else next.add(courseNodeId)
      return next
    })
  }, [])

  const reload = useCallback(() => {
    setReloadTick((n) => n + 1)
  }, [])

  const loaded = state.status === 'loaded' ? state.data : null
  const unlinked = loaded && hasAny(loaded.unlinked) ? loaded.unlinked : null
  const isEmpty = loaded !== null && loaded.courses.length === 0 && !unlinked

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link to="/students" className="btn-ghost btn-sm inline-flex items-center gap-1">
          {t('panel.studentWork.back')}
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 max-w-3xl">
          <h1 className="page-title">{t('panel.studentsMoney.title')}</h1>
          <p className="page-subtitle">{t('panel.studentsMoney.subtitle')}</p>
        </div>
        <div className="shrink-0">
          <MonthPicker month={month} current={current} onChange={setMonth} />
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="flex justify-center py-6" aria-hidden>
          <Loader2 size={20} className="animate-spin text-ink-light" />
        </div>
      )}

      {state.status === 'failed' && (
        <div className="card p-4 flex items-center justify-between gap-4 text-coral">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span role="alert">{t('panel.studentsMoney.loadFailed')}</span>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={reload}>
            {t('panel.criteria.retry')}
          </button>
        </div>
      )}

      {loaded && isEmpty && (
        <p className="text-ink">{t('panel.studentsMoney.emptyMonth')}</p>
      )}

      {loaded && !isEmpty && (
        <div className="space-y-4">
          <p className="text-lg font-semibold text-ink">
            {t('panel.studentsMoney.summary', {
              month: monthLabel(month, language),
              reviews: t('panel.studentsMoney.reviewsCount', {
                count: Math.abs(loaded.totals.reviews),
                n: formatNumber(language, loaded.totals.reviews),
              }),
              units: formatUnits(language, loaded.totals.units),
              money: formatMoneyInline(language, loaded.totals.money),
            })}
          </p>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm text-ink">
              <thead className="bg-canvas-dark/40 text-ink-light">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    {t('panel.studentsMoney.table.course')}
                  </th>
                  <th scope="col" className={HEAD}>
                    {t('panel.studentsMoney.table.reviews')}
                  </th>
                  <th scope="col" className={HEAD}>
                    {t('panel.studentsMoney.table.units')}
                  </th>
                  <th scope="col" className={HEAD}>
                    {t('panel.studentsMoney.table.money')}
                  </th>
                  <th scope="col" className={HEAD}>
                    {t('panel.studentsMoney.table.giftUnits')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loaded.courses.map((course) => (
                  <CourseRow
                    key={course.course_node_id}
                    course={course}
                    expanded={expanded.has(course.course_node_id)}
                    onToggle={() => toggleCourse(course.course_node_id)}
                  />
                ))}
                {unlinked && (
                  <tr className="border-t border-canvas-dark/40">
                    <th scope="row" className="px-3 py-2 text-start font-normal">
                      {t('panel.cost.unlinkedCourse')}
                    </th>
                    <FigureCells figures={unlinked} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
