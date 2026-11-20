import { useState } from 'react'
import { clsx } from 'clsx'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { studentsApi } from '../../api/students'
import { studentErrorMessage } from './studentErrors'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import type { ProvisionMode, ProvisionStudentRequest } from '../../types/api'

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

  const language = useLanguage()
  const t = useT()

  // Author-language mode labels — NOT the backend taxonomy (generate/manual/
  // existing). Progressive disclosure: only the active mode's conditional field
  // is shown.
  const modes: { value: ProvisionMode; label: string; hint: string }[] = [
    {
      value: 'generate',
      label: t('panel.students.provision.autoTitle'),
      hint: t('panel.students.provision.autoDesc'),
    },
    {
      value: 'manual',
      label: t('panel.students.provision.customTitle'),
      hint: t('panel.students.provision.customDesc'),
    },
    {
      value: 'existing',
      label: t('panel.students.provision.existingTitle'),
      hint: t('panel.students.provision.existingDesc'),
    },
  ]

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
    if (!login.trim()) return t('panel.students.provision.loginRequired')
    if (!password) return t('panel.students.provision.passwordRequired')
    if (mode === 'manual' && !externalId.trim()) return t('panel.students.provision.externalIdRequired')
    if (mode === 'existing' && !studentId.trim())
      return t('panel.students.provision.existingIdRequired')
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
      setError(studentErrorMessage(language, 'provision', err))
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title={t('panel.students.provision.title')}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-2">
          {modes.map((m) => (
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
              placeholder={t('panel.students.provision.externalIdPlaceholder')}
            />
          </div>
        )}
        {mode === 'existing' && (
          <div>
            <label className={labelCls}>
              {t('panel.students.provision.existingIdLabel')} <span className="text-coral">*</span>
            </label>
            <input
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder={t('panel.students.provision.existingIdPlaceholder')}
            />
          </div>
        )}

        <div>
          <label className={labelCls}>
            {t('panel.students.provision.loginLabel')} <span className="text-coral">*</span>
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
            {t('panel.students.provision.passwordLabel')} <span className="text-coral">*</span>
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
          <label className={labelCls}>{t('panel.students.provision.displayNameLabel')}</label>
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
            {t('panel.students.provision.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('panel.students.provision.submit')
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
