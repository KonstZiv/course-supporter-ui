import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { studentsApi } from '../../api/students'
import { studentErrorMessage } from './studentErrors'

const labelCls = 'block text-sm font-medium text-ink mb-1.5'

interface Props {
  open: boolean
  onClose: () => void
  studentId: string
  studentLabel: string
}

// DD-6-J author-side password reset (the fallback path when a student has no
// confirmed recovery email). The password is the student's secret; access is
// gated separately by is_active, so this never touches the revoke state and the
// roster is not refetched. The admin types the password; there is no generate
// helper and no show-once. Min-length is enforced backend-side (weak → 422,
// mapped in studentErrors); the form only gates the empty submit.
export function ResetPasswordModal({
  open,
  onClose,
  studentId,
  studentLabel,
}: Props) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const reset = () => {
    setPassword('')
    setSubmitting(false)
    setError(null)
    setDone(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Вкажіть пароль.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await studentsApi.setPassword(studentId, password)
      setDone(true)
    } catch (err) {
      setError(studentErrorMessage('reset', err))
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Скинути пароль">
      {done ? (
        <div className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            Пароль оновлено.
          </div>
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={close}>
              Закрити
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-light">
            Новий пароль порталу для <b>{studentLabel}</b>. Доступ студента не
            зміниться — оновиться лише пароль.
          </p>
          <div>
            <label className={labelCls}>
              Новий пароль <span className="text-coral">*</span>
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={close}>
              Скасувати
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Скинути пароль'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
