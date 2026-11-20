import { useEffect, useState } from 'react'
import { BookOpen, Loader2, AlertCircle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { EmptyState } from '../ui/EmptyState'
import { nodesApi } from '../../api/nodes'
import { studentsApi } from '../../api/students'
import { studentErrorMessage } from './studentErrors'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import type { NodeResponse } from '../../types/api'

interface Props {
  open: boolean
  onClose: () => void
  studentId: string
  enrolledIds: Set<string>
  onBound: () => void
}

// Bind picker — root courses come from GET /nodes (reused as-is). Already-
// enrolled roots are filtered out; the backend still guards a race with 409.
export function CoursePickerModal({
  open,
  onClose,
  studentId,
  enrolledIds,
  onBound,
}: Props) {
  const [roots, setRoots] = useState<NodeResponse[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [bindError, setBindError] = useState<string | null>(null)
  const [bindingId, setBindingId] = useState<string | null>(null)

  const language = useLanguage()
  const t = useT()

  useEffect(() => {
    if (!open) return
    setRoots(null)
    setLoadError(false)
    setBindError(null)
    setBindingId(null)
    nodesApi
      .listRoots(100)
      .then((r) => setRoots(r.items))
      .catch(() => setLoadError(true))
  }, [open])

  const bind = async (courseNodeId: string) => {
    setBindingId(courseNodeId)
    setBindError(null)
    try {
      await studentsApi.bind({ student_id: studentId, course_node_id: courseNodeId })
      onBound()
      onClose()
    } catch (err) {
      setBindError(studentErrorMessage(language, 'bind', err))
      setBindingId(null)
    }
  }

  const available = roots?.filter((r) => !enrolledIds.has(r.id)) ?? null

  return (
    <Modal open={open} onClose={onClose} title={t('panel.students.coursePicker.title')}>
      {bindError && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-coral-pale text-coral text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {bindError}
        </div>
      )}

      {loadError ? (
        <div className="flex items-center gap-2 py-6 text-coral text-sm">
          <AlertCircle size={16} />
          {t('panel.students.coursePicker.loadError')}
        </div>
      ) : available === null ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-navy" />
        </div>
      ) : available.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('panel.students.coursePicker.emptyTitle')}
          description={t('panel.students.coursePicker.emptyDescription')}
        />
      ) : (
        <ul className="space-y-1">
          {available.map((r) => (
            <li key={r.id}>
              <button
                className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-ink hover:bg-canvas-dark transition-colors disabled:opacity-50"
                disabled={bindingId !== null}
                onClick={() => bind(r.id)}
              >
                {bindingId === r.id ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <BookOpen size={14} className="shrink-0 text-ink-muted" />
                )}
                {r.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
