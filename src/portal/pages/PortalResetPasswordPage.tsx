import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import {
  RESET_TITLE,
  RESET_DESCRIPTION,
  RESET_PASSWORD_LABEL,
  RESET_SUBMIT,
  RESET_SUCCESS,
  RESET_GO_TO_LOGIN,
  RESET_REQUEST_NEW_LINK,
  PASSWORD_MIN_LENGTH,
  flowError,
} from '../recoveryTexts'

// Public reset-password landing (R3). The token rides in the query string of
// the email link ({PORTAL_BASE_URL}/{tenant}/reset-password?token=…). A missing
// token is a broken link — we explain, we never POST. A 400 (invalid/expired/
// used/revoked — one generic message) is terminal: the same token will only
// fail again, so we drop the form and offer a fresh forgot request. A short
// password is caught client-side before the POST (mirror of the backend
// minimum) so a weak-password 422 is essentially unreachable, but still handled.
export function PortalResetPasswordPage() {
  const { tenantId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
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
        <h2 className="font-display text-2xl text-ink mb-2">{RESET_TITLE}</h2>
        {children}
      </div>
    </div>
  )

  if (!token) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {flowError('missingToken')}
        </div>
        <Link to={`/${tenantId}/forgot-password`} className="btn-ghost btn-sm">
          {RESET_REQUEST_NEW_LINK}
        </Link>
      </>,
    )
  }

  if (done) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm mb-6">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          {RESET_SUCCESS}
        </div>
        <Link to={`/${tenantId}/login`} className="btn-primary btn-sm">
          {RESET_GO_TO_LOGIN}
        </Link>
      </>,
    )
  }

  if (tokenRejected) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {flowError('invalidToken')}
        </div>
        <Link to={`/${tenantId}/forgot-password`} className="btn-ghost btn-sm">
          {RESET_REQUEST_NEW_LINK}
        </Link>
      </>,
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(flowError('weakPassword'))
      return
    }

    setLoading(true)
    setError('')
    try {
      await portalApi.resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 400) {
        setTokenRejected(true)
      } else if (err instanceof PortalApiError && err.status === 422) {
        setError(flowError('weakPassword'))
      } else {
        setError(flowError('network'))
      }
    } finally {
      setLoading(false)
    }
  }

  return shell(
    <>
      <p className="text-ink-muted mb-8">{RESET_DESCRIPTION}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="portal-reset-password"
            className="block text-sm font-medium text-ink mb-1.5"
          >
            {RESET_PASSWORD_LABEL}
          </label>
          <input
            id="portal-reset-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="btn-primary w-full btn-lg"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {RESET_SUBMIT}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </>,
  )
}
