import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, FileText, Loader2, Users } from 'lucide-react'
import { ApiError } from '../api/client'
import { studentsApi } from '../api/students'
import type { AuthorStudentSubmissions } from '../types/api'
import { EmptyState } from '../components/ui/EmptyState'
import { presentationStateKey } from '../components/students/submissionHelpers'
import { useLanguage, useT } from '../i18n/LanguageContext'
import { formatDate } from '../utils/units'

const PAGE_SIZE = 20

export function StudentSubmissionsPage() {
  const { studentId = '' } = useParams()
  const navigate = useNavigate()
  const language = useLanguage()
  const t = useT()

  const [resp, setResp] = useState<AuthorStudentSubmissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [courseNodeId, setCourseNodeId] = useState('')
  const [offset, setOffset] = useState(0)

  const load = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setNotFound(false)
    setError(false)
    try {
      const data = await studentsApi.submissions(studentId, {
        courseNodeId: courseNodeId || undefined,
        limit: PAGE_SIZE,
        offset,
      })
      setResp(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [studentId, courseNodeId, offset])

  useEffect(() => {
    void load()
  }, [load])

  const handleCourseChange = (nextCourseId: string) => {
    setCourseNodeId(nextCourseId)
    setOffset(0)
  }

  if (loading && !resp) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to="/students" className="btn-ghost btn-sm inline-flex items-center gap-1">
            <ArrowLeft size={14} />
            {t('panel.studentWork.back')}
          </Link>
        </div>
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-navy" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to="/students" className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.studentWork.back')}
          </Link>
        </div>
        <div className="card p-6 text-ink-light">{t('panel.studentWork.notFound')}</div>
      </div>
    )
  }

  if (error || !resp) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to="/students" className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.studentWork.back')}
          </Link>
        </div>
        <div className="card p-4 flex items-center justify-between gap-4 text-coral">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{t('panel.studentWork.loadFailed')}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => void load()}>
            {t('panel.criteria.retry')}
          </button>
        </div>
      </div>
    )
  }

  const { student, enrollments, items, total } = resp
  const heading = student.display_name || student.login || student.student_id
  const from = total === 0 ? 0 : offset + 1
  const to = offset + items.length
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-4">
        <Link to="/students" className="btn-ghost btn-sm inline-flex items-center gap-1">
          {t('panel.studentWork.back')}
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="page-title">{heading}</h1>
          {student.login && <p className="page-subtitle">{student.login}</p>}
        </div>

        {enrollments.length > 0 && (
          <div>
            <select
              aria-label={t('panel.studentWork.col.course')}
              className="input text-sm"
              value={courseNodeId}
              onChange={(e) => handleCourseChange(e.target.value)}
            >
              <option value="">{t('panel.studentWork.filterAll')}</option>
              {enrollments.map((enr) => (
                <option key={enr.course_id} value={enr.course_id}>
                  {enr.course_title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {enrollments.length > 0 && (
        <div className="card p-4 mb-6 text-sm">
          <div className="font-medium text-ink mb-2">
            {t('panel.studentWork.enrolledIn')}
          </div>
          <ul className="space-y-1 text-ink-light">
            {enrollments.map((enr) => (
              <li key={enr.course_id}>
                {t('panel.studentWork.enrolledSince', {
                  course: enr.course_title,
                  date: formatDate(language, enr.enrolled_at),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('panel.studentWork.empty')}
          description=""
        />
      ) : (
        <>
          <div className="card overflow-hidden hidden min-[896px]:block">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-ink-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.task')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.course')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.attempt')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.submitted')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.reviewed')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.score')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('panel.studentWork.col.passed')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const detailPath = `/students/${encodeURIComponent(studentId)}/submissions/${encodeURIComponent(item.id)}`
                  const stateKey = presentationStateKey(item.presentation)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => navigate(detailPath)}
                      className="border-t border-canvas-dark/40 hover:bg-canvas/60 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={detailPath}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-navy hover:underline"
                          >
                            {item.task_title}
                          </Link>
                          {item.is_repeat_copy && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-canvas-dark text-ink-muted">
                              {t('panel.studentWork.repeatCopy')}
                            </span>
                          )}
                          {item.rejection && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-coral/10 text-coral">
                              {t('panel.studentWork.rejected')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-light">{item.course_title}</td>
                      <td className="px-4 py-3 text-ink-light">
                        {item.attempt_no ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-light">
                        {formatDate(language, item.created_at)}
                      </td>
                      <td className="px-4 py-3 text-ink-light">
                        {item.reviewed_at
                          ? formatDate(language, item.reviewed_at)
                          : stateKey
                            ? t(stateKey)
                            : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-light">
                        {item.score !== null && item.score !== undefined
                          ? item.score
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-light">
                        {item.passed === true
                          ? t('panel.studentWork.passedYes')
                          : item.passed === false
                            ? t('panel.studentWork.passedNo')
                            : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="min-[896px]:hidden">
            <EmptyState
              icon={Users}
              title={t('panel.students.narrowTitle')}
              description={t('panel.students.narrowDescription')}
            />
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-ink-muted">
            <span>{t('panel.students.rangeOfTotal', { from, to, total })}</span>
            <div className="hidden min-[896px]:flex gap-2">
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
        </>
      )}
    </div>
  )
}
