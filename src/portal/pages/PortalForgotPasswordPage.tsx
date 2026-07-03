import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import {
  FORGOT_TITLE,
  FORGOT_DESCRIPTION,
  FORGOT_LOGIN_LABEL,
  FORGOT_SUBMIT,
  FORGOT_SUCCESS,
  FORGOT_BACK_TO_LOGIN,
  flowError,
} from '../recoveryTexts'

// Public forgot-password screen (R3). Sibling of login, outside
// PortalProtectedRoute. Sends {tenant_id, login} → always 202 (anti-
// enumeration): on success we show a generic confirmation regardless of whether
// the login exists or has a confirmed recovery email. The tenant comes from the
// URL segment (same guard as the login page).
export function PortalForgotPasswordPage() {
  const { tenantId } = useParams()
  const [login, setLogin] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!login.trim()) return

    setLoading(true)
    setError('')
    try {
      await portalApi.forgotPassword({ tenant_id: tenantId, login: login.trim() })
      setSubmitted(true)
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 429) {
        setError(flowError('rateLimited'))
      } else {
        setError(flowError('network'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={20} className="text-amber-light" />
          </div>
          <span className="font-display text-2xl text-ink">Навчальний портал</span>
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">{FORGOT_TITLE}</h2>

        {submitted ? (
          <>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm mb-6">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              {FORGOT_SUCCESS}
            </div>
            <Link to={`/${tenantId}/login`} className="btn-ghost btn-sm">
              {FORGOT_BACK_TO_LOGIN}
            </Link>
          </>
        ) : (
          <>
            <p className="text-ink-muted mb-8">{FORGOT_DESCRIPTION}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="portal-forgot-login"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  {FORGOT_LOGIN_LABEL}
                </label>
                <input
                  id="portal-forgot-login"
                  type="text"
                  className="input"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
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
                disabled={loading || !login.trim()}
                className="btn-primary w-full btn-lg"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {FORGOT_SUBMIT}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <Link
                to={`/${tenantId}/login`}
                className="block text-center text-sm text-ink-muted hover:text-ink"
              >
                {FORGOT_BACK_TO_LOGIN}
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
