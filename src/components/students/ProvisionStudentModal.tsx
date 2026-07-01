import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { studentsApi } from '../../api/students'
import { studentErrorMessage } from './studentErrors'
import type { ProvisionMode, ProvisionStudentRequest } from '../../types/api'

// Author-language mode labels — NOT the backend taxonomy (generate/manual/
// existing). Progressive disclosure: only the active mode's conditional field
// is shown.
const MODES: { value: ProvisionMode; label: string; hint: string }[] = [
  {
    value: 'generate',
    label: 'Новий студент',
    hint: 'Система згенерує external ID автоматично.',
  },
  {
    value: 'manual',
    label: 'Новий студент із власним ID',
    hint: 'Ви вказуєте external ID вручну (з вашої системи).',
  },
  {
    value: 'existing',
    label: 'Дати доступ наявному студенту',
    hint: 'Прикріпити портальний логін до наявного студента за його ID.',
  },
]

const labelCls = 'block text-sm font-medium text-ink mb-1.5'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function ProvisionStudentModal({ open, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<ProvisionMode>('generate')
  const [externalId, setExternalId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setMode('generate')
    setExternalId('')
    setStudentId('')
    setLogin('')
    setPassword('')
    setDisplayName('')
    setError(null)
    setSubmitting(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  // Client-side cross-field validation — mirrors the backend model_validator,
  // and keeps the array-shape 422 from ever reaching the error dictionary.
  const validate = (): string | null => {
    if (!login.trim()) return 'Вкажіть логін.'
    if (!password) return 'Вкажіть пароль.'
    if (mode === 'manual' && !externalId.trim()) return 'Вкажіть external ID.'
    if (mode === 'existing' && !studentId.trim())
      return 'Вкажіть ID наявного студента.'
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setSubmitting(true)
    setError(null)
    const body: ProvisionStudentRequest = {
      mode,
      login: login.trim(),
      password,
      display_name: displayName.trim() || null,
      ...(mode === 'manual' ? { external_id: externalId.trim() } : {}),
      ...(mode === 'existing' ? { student_id: studentId.trim() } : {}),
    }
    try {
      await studentsApi.provision(body)
      close()
      onCreated()
    } catch (err) {
      setError(studentErrorMessage('provision', err))
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Додати студента">
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-2">
          {MODES.map((m) => (
            <label
              key={m.value}
              className={clsx(
                'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                mode === m.value
                  ? 'border-navy bg-navy-pale'
                  : 'border-canvas-dark hover:bg-canvas',
              )}
            >
              <input
                type="radio"
                name="provision-mode"
                className="mt-1"
                checked={mode === m.value}
                onChange={() => {
                  setMode(m.value)
                  setError(null)
                }}
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  {m.label}
                </span>
                <span className="block text-xs text-ink-muted">{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'manual' && (
          <div>
            <label className={labelCls}>
              External ID <span className="text-coral">*</span>
            </label>
            <input
              className="input"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="ідентифікатор з вашої системи"
            />
          </div>
        )}
        {mode === 'existing' && (
          <div>
            <label className={labelCls}>
              ID наявного студента <span className="text-coral">*</span>
            </label>
            <input
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="UUID студента"
            />
          </div>
        )}

        <div>
          <label className={labelCls}>
            Логін <span className="text-coral">*</span>
          </label>
          <input
            className="input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={labelCls}>
            Пароль <span className="text-coral">*</span>
          </label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className={labelCls}>Ім’я для показу</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
              'Створити'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
