import { useEffect, useState } from 'react'
import { Mail, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMe } from '../types'
import {
  SECTION_TITLE,
  SECTION_DESCRIPTION,
  SECTION_EMAIL_LABEL,
  SECTION_STATE_NONE,
  SECTION_STATE_PENDING,
  SECTION_STATE_CONFIRMED,
  SECTION_ADD,
  SECTION_CHANGE,
  SECTION_SAVE,
  SECTION_CANCEL,
  SECTION_RESEND,
  SECTION_RESENT,
  SECTION_LOAD_ERROR,
  flowError,
} from '../recoveryTexts'

// Minimal mirror of the backend email shape (RP6: "@" + non-empty local +
// non-empty domain, max 320) — no strict RFC.
function isEmailShaped(value: string): boolean {
  if (value.length === 0 || value.length > 320) return false
  const at = value.indexOf('@')
  if (at <= 0) return false
  if (value.indexOf('@', at + 1) !== -1) return false
  return value.length - at - 1 > 0
}

// Recovery-email management, inline on the portal home (ratify A: a card below
// the courses, its own component). The /me fetch is encapsulated HERE — the home
// page itself keeps its "no /me round-trip" stance; this section is the local
// exception that needs the recovery state. Set/change POSTs the recovery email
// (which resets confirmed → false and mails a confirm link); "resend" re-POSTs
// the same address (the backend burns the old token and mails a fresh link).
export function RecoveryEmailSection() {
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
      setFormError(flowError('invalidEmail'))
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
        setFormError(flowError('invalidEmail'))
      } else {
        setFormError(flowError('network'))
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
        setResendError(flowError('network'))
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
          <h2 className="font-display text-lg text-ink">{SECTION_TITLE}</h2>
        </div>
        {children}
      </div>
    </section>
  )

  if (loadError) {
    return card(<p className="text-sm text-coral">{SECTION_LOAD_ERROR}</p>)
  }

  if (me === null) {
    return card(
      <div className="flex items-center gap-2 text-ink-muted text-sm">
        <Loader2 size={16} className="animate-spin" />
        Завантаження…
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
            {SECTION_EMAIL_LABEL}
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
            {saving ? <Loader2 size={16} className="animate-spin" /> : SECTION_SAVE}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="btn-ghost btn-sm"
          >
            {SECTION_CANCEL}
          </button>
        </div>
      </form>,
    )
  }

  // --- read states: none / pending / confirmed ---
  if (recoveryEmail === null) {
    return card(
      <>
        <p className="text-sm text-ink-muted mb-4">{SECTION_DESCRIPTION}</p>
        <p className="text-sm text-ink-muted mb-4">{SECTION_STATE_NONE}</p>
        <button onClick={() => openForm('')} className="btn-primary btn-sm">
          {SECTION_ADD}
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
          {SECTION_STATE_CONFIRMED}
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-sm text-amber-dark mb-4">
          <Clock size={16} className="shrink-0 mt-0.5" />
          {SECTION_STATE_PENDING}
        </p>
      )}
      {resent && (
        <p className="flex items-center gap-1.5 text-sm text-forest mb-4">
          <CheckCircle2 size={16} />
          {SECTION_RESENT}
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
          {SECTION_CHANGE}
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
              SECTION_RESEND
            )}
          </button>
        )}
      </div>
    </>,
  )
}
