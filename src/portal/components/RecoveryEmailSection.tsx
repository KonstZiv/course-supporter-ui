import { useEffect, useState } from 'react'
import { Mail, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMe } from '../types'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { flowError } from '../recoveryTexts'
import { isEmailShaped } from '../emailShape'

// Recovery-email management, inline on the portal home (ratify A: a card below
// the courses, its own component). The /me fetch is encapsulated HERE — the home
// page itself keeps its "no /me round-trip" stance; this section is the local
// exception that needs the recovery state. Set/change POSTs the recovery email
// (which resets confirmed → false and mails a confirm link); "resend" re-POSTs
// the same address (the backend burns the old token and mails a fresh link).
export function RecoveryEmailSection() {
  const language = useLanguage()
  const t = useT()
  const [me, setMe] = useState<PortalMe | null>(null)
  const [loadError, setLoadError] = useState(false)

  const [editing, setEditing] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [resendError, setResendError] = useState('')

  useEffect(() => {
    portalApi
      .me()
      .then(setMe)
      .catch((err) => {
        // 401 is handled inside the client (clear + redirect); anything else is
        // a soft error on this section.
        if (!(err instanceof PortalApiError && err.status === 401)) {
          setLoadError(true)
        }
      })
  }, [])

  const openForm = (prefill: string) => {
    setEmailInput(prefill)
    setFormError('')
    setResent(false)
    setResendError('')
    setEditing(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = emailInput.trim()
    if (!isEmailShaped(email)) {
      setFormError(flowError(language, 'invalidEmail'))
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const res = await portalApi.setRecoveryEmail({ email })
      setMe((prev) =>
        prev
          ? {
              ...prev,
              recovery_email: res.recovery_email,
              recovery_email_confirmed: res.recovery_email_confirmed,
            }
          : prev,
      )
      setEditing(false)
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 422) {
        setFormError(flowError(language, 'invalidEmail'))
      } else {
        setFormError(flowError(language, 'network'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleResend = async () => {
    if (!me?.recovery_email) return
    setResending(true)
    setResent(false)
    setResendError('')
    try {
      await portalApi.setRecoveryEmail({ email: me.recovery_email })
      setResent(true)
    } catch (err) {
      // An explicit user action must give feedback (mirror of handleSave). A
      // 401 is handled inside the client (clear + redirect); anything else
      // surfaces a network error while the pending state + affordances stay.
      if (!(err instanceof PortalApiError && err.status === 401)) {
        setResendError(flowError(language, 'network'))
      }
    } finally {
      setResending(false)
    }
  }

  const card = (children: React.ReactNode) => (
    <section className="mt-12">
      <div className="card p-6 max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={18} className="text-navy" />
          <h2 className="font-display text-lg text-ink">{t('portal.recovery.section.title')}</h2>
        </div>
        {children}
      </div>
    </section>
  )

  if (loadError) {
    return card(<p className="text-sm text-coral">{t('portal.recovery.section.loadError')}</p>)
  }

  if (me === null) {
    return card(
      <div className="flex items-center gap-2 text-ink-muted text-sm">
        <Loader2 size={16} className="animate-spin" />
        {t('portal.common.loading')}
      </div>,
    )
  }

  const recoveryEmail = me.recovery_email
  const confirmed = me.recovery_email_confirmed

  if (editing) {
    return card(
      <form onSubmit={handleSave} className="mt-2 space-y-3" noValidate>
        <div>
          <label
            htmlFor="recovery-email"
            className="block text-sm font-medium text-ink mb-1.5"
          >
            {t('portal.recovery.section.emailLabel')}
          </label>
          <input
            id="recovery-email"
            type="email"
            className="input"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            autoFocus
          />
        </div>
        {formError && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-coral-pale text-coral text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {formError}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving || !emailInput.trim()}
            className="btn-primary btn-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : t('portal.recovery.section.save')}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-ghost btn-sm"
          >
            {t('portal.recovery.section.cancel')}
          </button>
        </div>
      </form>,
    )
  }

  // --- read states: none / pending / confirmed ---
  if (recoveryEmail === null) {
    return card(
      <>
        <p className="text-sm text-ink-muted mb-4">{t('portal.recovery.section.description')}</p>
        <p className="text-sm text-ink-muted mb-4">{t('portal.recovery.section.stateNone')}</p>
        <button onClick={() => openForm('')} className="btn-primary btn-sm">
          {t('portal.recovery.section.add')}
        </button>
      </>,
    )
  }

  return card(
    <>
      <p className="text-sm text-ink mb-2">{recoveryEmail}</p>
      {confirmed ? (
        <p className="flex items-center gap-1.5 text-sm text-forest mb-4">
          <CheckCircle2 size={16} />
          {t('portal.recovery.section.stateConfirmed')}
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-sm text-amber-dark mb-4">
          <Clock size={16} className="shrink-0 mt-0.5" />
          {t('portal.recovery.section.statePending')}
        </p>
      )}
      {resent && (
        <p className="flex items-center gap-1.5 text-sm text-forest mb-4">
          <CheckCircle2 size={16} />
          {t('portal.recovery.section.resent')}
        </p>
      )}
      {resendError && (
        <p className="flex items-start gap-1.5 text-sm text-coral mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {resendError}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => openForm(recoveryEmail)}
          className="btn-ghost btn-sm"
        >
          {t('portal.recovery.section.change')}
        </button>
        {!confirmed && (
          <button
            onClick={handleResend}
            disabled={resending}
            className="btn-ghost btn-sm"
          >
            {resending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('portal.recovery.section.resend')
            )}
          </button>
        )}
      </div>
    </>,
  )
}
