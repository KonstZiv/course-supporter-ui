import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, BarChart3, Loader2 } from 'lucide-react'
import { ApiError } from '../api/client'
import { courseHomeworkApi } from '../api/course-homework'
import { EmptyState } from '../components/ui/EmptyState'
import { useLanguage, useT } from '../i18n/LanguageContext'
import { localeOf } from '../i18n/languages'
import type { MessageKey } from '../i18n/translate'
import type {
  CourseHomeworkCell,
  CourseHomeworkCellState,
  CourseHomeworkCriterionWeight,
  CourseHomeworkSummary,
  CourseHomeworkTable,
} from '../types/api'
import { formatNumber } from '../utils/units'

type ProgressTab = 'tasks' | 'students'

const PAGE_SIZE = 500

const WEIGHT_KEYS: Record<CourseHomeworkCriterionWeight, MessageKey> = {
  must: 'panel.criteria.weight.must',
  should: 'panel.criteria.weight.should',
}

const CELL_STATE_STYLE: Record<
  Exclude<CourseHomeworkCellState, 'not_submitted'>,
  { labelKey: MessageKey; cls: string }
> = {
  passed: {
    labelKey: 'panel.courseProgress.students.state.passed',
    cls: 'bg-forest-pale text-forest',
  },
  in_review: {
    labelKey: 'panel.courseProgress.students.state.inReview',
    cls: 'bg-amber-pale text-amber-dark',
  },
  not_passed: {
    labelKey: 'panel.courseProgress.students.state.notPassed',
    cls: 'bg-coral-pale text-coral',
  },
}

function StudentCellView({ cell }: { cell: CourseHomeworkCell | undefined }) {
  const language = useLanguage()
  const t = useT()

  if (!cell || cell.state === 'not_submitted') {
    return <span className="text-ink-muted">—</span>
  }

  const badge = CELL_STATE_STYLE[cell.state]
  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.cls}`}
      >
        {t(badge.labelKey)}
      </span>
      {cell.attempts > 0 && (
        <div className="text-xs text-ink-muted whitespace-nowrap">
          {t('panel.courseProgress.students.cellDetails', {
            score: cell.best_score !== null ? formatNumber(language, cell.best_score) : '—',
            count: cell.attempts,
            n: formatNumber(language, cell.attempts),
          })}
        </div>
      )}
    </div>
  )
}

export function CourseProgressPage() {
  const { courseId = '' } = useParams<{ courseId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useLanguage()
  const t = useT()

  const tab: ProgressTab =
    searchParams.get('tab') === 'students' ? 'students' : 'tasks'
  const includeTestStudents = searchParams.get('include_test_students') === 'true'

  const [offset, setOffset] = useState(0)
  const [summary, setSummary] = useState<CourseHomeworkSummary | null>(null)
  const [table, setTable] = useState<CourseHomeworkTable | null>(null)
  const [courseTitle, setCourseTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const requestRef = useRef(0)

  const locale = localeOf(language)
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 0,
      }),
    [locale],
  )
  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
      }),
    [locale],
  )

  useEffect(() => {
    setOffset(0)
    setSummary(null)
    setTable(null)
    setCourseTitle(null)
  }, [courseId])

  const load = useCallback(async () => {
    if (!courseId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setNotFound(false)
    setError(false)
    try {
      if (tab === 'tasks') {
        const data = await courseHomeworkApi.summary(courseId, includeTestStudents)
        if (requestId !== requestRef.current) return
        setSummary(data)
        setCourseTitle(data.course_title)
      } else {
        const data = await courseHomeworkApi.students(courseId, {
          includeTestStudents,
          limit: PAGE_SIZE,
          offset,
        })
        if (requestId !== requestRef.current) return
        setTable(data)
        setCourseTitle(data.course_title)
      }
    } catch (err) {
      if (requestId !== requestRef.current) return
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        setError(true)
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [courseId, tab, includeTestStudents, offset])

  useEffect(() => {
    void load()
  }, [load])

  const handleTabChange = (next: ProgressTab) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set('tab', next)
      return nextParams
    })
  }

  const handleToggleTestStudents = (checked: boolean) => {
    setOffset(0)
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      if (checked) nextParams.set('include_test_students', 'true')
      else nextParams.delete('include_test_students')
      return nextParams
    })
  }

  const coursePath = `/course/${encodeURIComponent(courseId)}`

  if (notFound) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to="/" className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.course.backToCourses')}
          </Link>
        </div>
        <div className="card p-6 text-ink-light">
          {t('panel.students.error.courseNotFound')}
        </div>
      </div>
    )
  }

  if (loading && !courseTitle) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to={coursePath} className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.courseProgress.back')}
          </Link>
        </div>
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-navy" />
        </div>
      </div>
    )
  }

  if (error && !courseTitle) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to={coursePath} className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.courseProgress.back')}
          </Link>
        </div>
        <div className="card p-4 flex items-center justify-between gap-4 text-coral">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{t('panel.courseProgress.loadFailed')}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => void load()}>
            {t('panel.criteria.retry')}
          </button>
        </div>
      </div>
    )
  }

  const activeData = tab === 'tasks' ? summary : table
  const excludedTestStudents = activeData?.excluded_test_students ?? 0
  const showExcludedNote = !includeTestStudents && excludedTestStudents > 0

  const summaryEmpty =
    summary !== null &&
    (summary.tasks.length === 0 ||
      summary.tasks.every((task) => task.students_submitted === 0))
  const tableEmpty =
    table !== null && (table.students.length === 0 || table.tasks.length === 0)

  const total = table?.total ?? 0
  const limit = table?.limit ?? PAGE_SIZE
  const currentOffset = table?.offset ?? offset
  const from = total === 0 ? 0 : currentOffset + 1
  const to = currentOffset + (table?.students.length ?? 0)
  const canPrev = currentOffset > 0
  const canNext = currentOffset + limit < total

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
      <div>
        <Link to={coursePath} className="btn-ghost btn-sm inline-flex items-center gap-1">
          {t('panel.courseProgress.back')}
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="page-title">
          {t('panel.courseProgress.title', { course: courseTitle ?? '' })}
        </h1>

        <div className="flex flex-col items-start lg:items-end gap-1">
          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-canvas-dark text-navy focus:ring-navy"
              checked={includeTestStudents}
              onChange={(e) => handleToggleTestStudents(e.target.checked)}
            />
            <span>{t('panel.courseProgress.includeTestStudents')}</span>
          </label>
          {showExcludedNote && (
            <p className="text-xs text-ink-muted">
              {t('panel.courseProgress.excludedTestStudents', {
                n: formatNumber(language, excludedTestStudents),
              })}
            </p>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label={t('panel.courseProgress.title', { course: courseTitle ?? '' })}
        className="flex gap-2 border-b border-canvas-dark/60"
      >
        {(['tasks', 'students'] as const).map((tabKey) => {
          const active = tab === tabKey
          const labelKey =
            tabKey === 'tasks'
              ? 'panel.courseProgress.tab.tasks'
              : 'panel.courseProgress.tab.students'
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleTabChange(tabKey)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-navy text-navy'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t(labelKey)}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-navy" />
        </div>
      )}

      {!loading && error && (
        <div className="card p-4 flex items-center justify-between gap-4 text-coral">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{t('panel.courseProgress.loadFailed')}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => void load()}>
            {t('panel.criteria.retry')}
          </button>
        </div>
      )}

      {!loading && !error && tab === 'tasks' && summary && (
        summaryEmpty ? (
          <EmptyState
            icon={BarChart3}
            title={t('panel.courseProgress.empty')}
            description=""
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-light">
              {t('panel.courseProgress.tasks.description')}
            </p>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm text-ink">
                <thead className="bg-canvas text-ink-muted text-xs uppercase">
                  <tr>
                    <th scope="col" className="text-left px-4 py-3 font-medium">
                      {t('panel.courseProgress.tasks.col.assignment')}
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-medium whitespace-nowrap">
                      {t('panel.courseProgress.tasks.col.submitted')}
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-medium whitespace-nowrap">
                      {t('panel.courseProgress.tasks.col.attempts')}
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-medium whitespace-nowrap">
                      {t('panel.courseProgress.tasks.col.passed')}
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-medium whitespace-nowrap">
                      {t('panel.courseProgress.tasks.col.averageScore')}
                    </th>
                    <th scope="col" className="text-right px-4 py-3 font-medium whitespace-nowrap">
                      {t('panel.courseProgress.tasks.col.passingAttempt')}
                    </th>
                    <th scope="col" className="text-left px-4 py-3 font-medium">
                      {t('panel.courseProgress.tasks.col.hardestCriteria')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.tasks.map((task) => {
                    const isTest = task.task_type === 'test'
                    const criteria = isTest ? [] : task.hardest_criteria.slice(0, 3)
                    return (
                      <tr
                        key={task.task_id}
                        className="border-t border-canvas-dark/40 align-top"
                      >
                        <th scope="row" className="text-left px-4 py-3 font-normal">
                          <div className="font-medium text-ink">{task.title}</div>
                          <div className="text-xs text-ink-muted">{task.node_title}</div>
                        </th>
                        <td className="px-4 py-3 text-ink-light whitespace-nowrap">
                          {t('panel.courseProgress.tasks.submittedCount', {
                            count: task.students_submitted,
                            n: formatNumber(language, task.students_submitted),
                          })}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-light whitespace-nowrap">
                          {formatNumber(language, task.submissions)}
                        </td>
                        <td className="px-4 py-3 text-ink-light whitespace-nowrap">
                          {task.pass_share !== null
                            ? t('panel.courseProgress.tasks.passedValue', {
                                percent: percentFormatter.format(task.pass_share),
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-light whitespace-nowrap">
                          {task.average_score !== null
                            ? decimalFormatter.format(task.average_score)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-light whitespace-nowrap">
                          {task.attempts_to_pass !== null
                            ? decimalFormatter.format(task.attempts_to_pass.median)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-light">
                          {criteria.length === 0 ? (
                            '—'
                          ) : (
                            <ul className="space-y-1">
                              {criteria.map((c) => (
                                <li key={c.criterion_id}>
                                  {t('panel.courseProgress.tasks.criterionLine', {
                                    text: c.text,
                                    n: formatNumber(language, c.not_met_students),
                                    m: formatNumber(language, c.judged_students),
                                    weight: t(WEIGHT_KEYS[c.weight]),
                                  })}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {!loading && !error && tab === 'students' && table && (
        tableEmpty ? (
          <EmptyState
            icon={BarChart3}
            title={t('panel.courseProgress.empty')}
            description=""
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-light">
              {t('panel.courseProgress.students.description')}
            </p>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm text-ink">
                <thead className="bg-canvas text-ink-muted text-xs uppercase">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-canvas text-left px-4 py-3 font-medium whitespace-nowrap border-r border-canvas-dark/40"
                    >
                      {t('panel.courseProgress.students.col.student')}
                    </th>
                    {table.tasks.map((task) => (
                      <th
                        key={task.task_id}
                        scope="col"
                        className="text-left px-4 py-3 font-medium min-w-[10rem] align-top"
                      >
                        <div>{task.title}</div>
                        <div className="text-[11px] font-normal normal-case text-ink-muted mt-0.5">
                          {task.node_title}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.students.map((student) => {
                    const name =
                      student.display_name ||
                      student.login ||
                      t('panel.courseProgress.students.unnamed')
                    return (
                      <tr
                        key={student.student_id}
                        className="border-t border-canvas-dark/40 align-top"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-white text-left px-4 py-3 font-medium whitespace-nowrap border-r border-canvas-dark/40"
                        >
                          <Link
                            to={`/students/${encodeURIComponent(student.student_id)}`}
                            className="text-navy hover:underline"
                          >
                            {name}
                          </Link>
                        </th>
                        {table.tasks.map((task) => (
                          <td key={task.task_id} className="px-4 py-3">
                            <StudentCellView cell={student.cells[task.task_id]} />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className="flex items-center justify-between text-sm text-ink-muted">
                <span>{t('panel.students.rangeOfTotal', { from, to, total })}</span>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost btn-sm"
                    disabled={!canPrev}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  >
                    {t('panel.students.pagination.prev')}
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    disabled={!canNext}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  >
                    {t('panel.students.pagination.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
