import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import {
  CONFIRM_TITLE,
  CONFIRM_DESCRIPTION,
  CONFIRM_SUBMIT,
  CONFIRM_SUCCESS,
  CONFIRM_GO_TO_PORTAL,
  CONFIRM_INVALID_HINT,
  flowError,
} from '../recoveryTexts'

// Public confirm-email landing (R3). The token rides in the query string of the
// email link. Redemption is behind an EXPLICIT button, never auto-fired on
// mount (ratify B): the token is single-use, and JS-executing mail scanners can
// otherwise burn it before the student clicks. A 400 is terminal (the token is
// spent/invalid) — we drop the button and hint to re-request from inside the
// portal. Success offers a link to the portal (TenantIndex resolves session vs
// login).
export function PortalConfirmEmailPage() {
  const { tenantId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [tokenRejected, setTokenRejected] = useState(false)

  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={20} className="text-amber-light" />
          </div>
          <span className="font-display text-2xl text-ink">Навчальний портал</span>
        </div>
        <h2 className="font-display text-2xl text-ink mb-2">{CONFIRM_TITLE}</h2>
        {children}
      </div>
    </div>
  )

  const invalidPanel = (message: string) =>
    shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm mb-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {message}
        </div>
        <p className="text-sm text-ink-muted">{CONFIRM_INVALID_HINT}</p>
      </>,
    )

  if (!token) {
    return invalidPanel(flowError('missingToken'))
  }

  if (tokenRejected) {
    return invalidPanel(flowError('invalidToken'))
  }

  if (done) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm mb-6">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          {CONFIRM_SUCCESS}
        </div>
        <Link to={`/${tenantId}`} className="btn-primary btn-sm">
          {CONFIRM_GO_TO_PORTAL}
        </Link>
      </>,
    )
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError('')
    try {
      await portalApi.confirmEmail({ token })
      setDone(true)
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 400) {
        setTokenRejected(true)
      } else {
        setError(flowError('network'))
      }
    } finally {
      setLoading(false)
    }
  }

  return shell(
    <>
      <p className="text-ink-muted mb-8">{CONFIRM_DESCRIPTION}</p>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm mb-4">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading}
        className="btn-primary w-full btn-lg"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            {CONFIRM_SUBMIT}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </>,
  )
}
