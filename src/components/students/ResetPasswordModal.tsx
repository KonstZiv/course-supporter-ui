import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { studentsApi } from '../../api/students'
import { studentErrorMessage } from './studentErrors'
import { Message } from '../../i18n/Message'
import { useLanguage, useT } from '../../i18n/LanguageContext'

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

  const language = useLanguage()
  const t = useT()

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
      setError(t('panel.students.resetPassword.passwordRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await studentsApi.setPassword(studentId, password)
      setDone(true)
    } catch (err) {
      setError(studentErrorMessage(language, 'reset', err))
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={t('panel.students.resetPassword.title')}>
      {done ? (
        <div className="space-y-5">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            {t('panel.students.resetPassword.updated')}
          </div>
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={close}>
              {t('panel.students.resetPassword.close')}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-light">
            <Message
              id="panel.students.resetPassword.prompt"
              values={{
                name: studentLabel,
                b: (chunks) => <b>{chunks}</b>,
              }}
            />
          </p>
          <div>
            <label className={labelCls}>
              {t('panel.students.resetPassword.passwordLabel')} <span className="text-coral">*</span>
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
              {t('panel.students.resetPassword.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t('panel.students.resetPassword.submit')
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
