import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { studentsApi } from '../../api/students'
import { studentErrorMessage } from './studentErrors'
import { StudentStatusBadge } from './StudentStatusBadge'
import { CoursePickerModal } from './CoursePickerModal'
import { Modal } from '../ui/Modal'
import type { StudentEnrollmentItem, StudentRosterItem } from '../../types/api'

interface Props {
  student: StudentRosterItem
  // Resolve a course title from the roots the page already fetched; null when
  // the enrollment points at a since-deleted course (dangling — kept so it can
  // be unbound).
  titleOf: (courseNodeId: string) => string | null
  onChanged: () => void
}

export function StudentRow({ student, titleOf, onChanged }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [enrollments, setEnrollments] = useState<StudentEnrollmentItem[] | null>(
    null,
  )
  const [enrLoading, setEnrLoading] = useState(false)
  const [enrError, setEnrError] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [unbindingId, setUnbindingId] = useState<string | null>(null)

  const displayName =
    student.display_name || student.login || student.external_id

  const loadEnrollments = useCallback(async () => {
    setEnrLoading(true)
    setEnrError(false)
    try {
      const res = await studentsApi.enrollments(student.student_id)
      setEnrollments(res.items)
    } catch {
      setEnrError(true)
    } finally {
      setEnrLoading(false)
    }
  }, [student.student_id])

  useEffect(() => {
    if (expanded && enrollments === null && !enrLoading && !enrError) {
      void loadEnrollments()
    }
  }, [expanded, enrollments, enrLoading, enrError, loadEnrollments])

  const runAction = async (fn: () => Promise<void>, action: 'revoke' | 'restore') => {
    setActionBusy(true)
    setActionError(null)
    try {
      await fn()
      onChanged()
    } catch (err) {
      setActionError(studentErrorMessage(action, err))
    } finally {
      setActionBusy(false)
    }
  }

  const revoke = () => {
    setConfirmRevoke(false)
    void runAction(() => studentsApi.revoke(student.student_id), 'revoke')
  }
  const restore = () =>
    void runAction(() => studentsApi.restore(student.student_id), 'restore')

  const unbind = async (courseNodeId: string) => {
    setUnbindingId(courseNodeId)
    setActionError(null)
    try {
      await studentsApi.unbind(student.student_id, courseNodeId)
      await loadEnrollments()
      onChanged()
    } catch (err) {
      setActionError(studentErrorMessage('unbind', err))
    } finally {
      setUnbindingId(null)
    }
  }

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_node_id))

  return (
    <>
      <tr className="border-t border-canvas-dark/40">
        <td className="px-4 py-3">
          <button
            className="flex items-center gap-2 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDown size={16} className="text-ink-muted shrink-0" />
            ) : (
              <ChevronRight size={16} className="text-ink-muted shrink-0" />
            )}
            <span className="font-medium text-ink">{displayName}</span>
          </button>
        </td>
        <td className="px-4 py-3 text-ink-light">{student.login ?? '—'}</td>
        <td className="px-4 py-3">
          <StudentStatusBadge isActive={student.is_active} />
        </td>
        <td className="px-4 py-3 text-ink-light">{student.enrollment_count}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {actionBusy && <Loader2 size={14} className="animate-spin text-ink-muted" />}
            {student.is_active === true && (
              <button
                className="btn-ghost btn-sm text-coral"
                disabled={actionBusy}
                onClick={() => setConfirmRevoke(true)}
              >
                Відкликати
              </button>
            )}
            {student.is_active === false && (
              <button
                className="btn-ghost btn-sm"
                disabled={actionBusy}
                onClick={restore}
              >
                Відновити
              </button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-canvas/50">
          <td colSpan={5} className="px-4 py-3">
            {actionError && (
              <div className="flex items-center gap-2 mb-2 text-sm text-coral">
                <AlertCircle size={14} />
                {actionError}
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase text-ink-muted">
                Курси
              </span>
              <button
                className="btn-ghost btn-sm"
                onClick={() => setPickerOpen(true)}
              >
                <Plus size={14} /> Додати курс
              </button>
            </div>

            {enrLoading ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-2">
                <Loader2 size={14} className="animate-spin" /> Завантаження…
              </div>
            ) : enrError ? (
              <button
                className="text-sm text-coral underline"
                onClick={() => void loadEnrollments()}
              >
                Помилка завантаження — повторити
              </button>
            ) : (enrollments ?? []).length === 0 ? (
              <p className="text-sm text-ink-muted py-1">Немає зарахувань.</p>
            ) : (
              <ul className="space-y-1">
                {(enrollments ?? []).map((e) => {
                  const title = titleOf(e.course_node_id)
                  return (
                    <li
                      key={e.course_node_id}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white border border-canvas-dark/40"
                    >
                      <span className="text-sm text-ink">
                        {title ?? (
                          <span className="text-ink-muted italic">
                            видалений курс ({e.course_node_id.slice(0, 8)}…)
                          </span>
                        )}
                      </span>
                      <button
                        className="p-1 rounded-md hover:bg-coral-pale hover:text-coral text-ink-muted disabled:opacity-50"
                        disabled={unbindingId !== null}
                        onClick={() => void unbind(e.course_node_id)}
                        title="Відрахувати з курсу"
                      >
                        {unbindingId === e.course_node_id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </td>
        </tr>
      )}

      <Modal
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="Відкликати доступ"
      >
        <p className="text-sm text-ink-light mb-5">
          Відкликати доступ до порталу для <b>{displayName}</b>? Студент та вся
          його історія збережуться — доступ можна відновити пізніше.
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="btn-ghost"
            onClick={() => setConfirmRevoke(false)}
          >
            Скасувати
          </button>
          <button className="btn-danger" onClick={revoke}>
            Відкликати
          </button>
        </div>
      </Modal>

      <CoursePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        studentId={student.student_id}
        enrolledIds={enrolledIds}
        onBound={() => {
          void loadEnrollments()
          onChanged()
        }}
      />
    </>
  )
}
