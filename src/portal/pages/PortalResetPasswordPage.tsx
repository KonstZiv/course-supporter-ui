import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { PASSWORD_MIN_LENGTH, flowError } from '../recoveryTexts'

// Public reset-password landing (R3). The token rides in the query string of
// the email link ({PORTAL_BASE_URL}/{tenant}/reset-password?token=…). A missing
// token is a broken link — we explain, we never POST. A 400 (invalid/expired/
// used/revoked — one generic message) is terminal: the same token will only
// fail again, so we drop the form and offer a fresh forgot request. A short
// password is caught client-side before the POST (mirror of the backend
// minimum) so a weak-password 422 is essentially unreachable, but still handled.
export function PortalResetPasswordPage() {
  const { tenantId } = useParams()
  const language = useLanguage()
  const t = useT()
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
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={20} className="text-amber-light" />
          </div>
          <span className="font-display text-2xl text-ink">{t('portal.header.name')}</span>
        </div>
        <h2 className="font-display text-2xl text-ink mb-2">{t('portal.recovery.reset.title')}</h2>
        {children}
      </div>
    </div>
  )

  if (!token) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {flowError(language, 'missingToken')}
        </div>
        <Link to={`/${tenantId}/forgot-password`} className="btn-ghost btn-sm">
          {t('portal.recovery.reset.requestNewLink')}
        </Link>
      </>,
    )
  }

  if (done) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-forest-pale text-forest text-sm mb-6">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          {t('portal.recovery.reset.success')}
        </div>
        <Link to={`/${tenantId}/login`} className="btn-primary btn-sm">
          {t('portal.recovery.reset.goToLogin')}
        </Link>
      </>,
    )
  }

  if (tokenRejected) {
    return shell(
      <>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {flowError(language, 'invalidToken')}
        </div>
        <Link to={`/${tenantId}/forgot-password`} className="btn-ghost btn-sm">
          {t('portal.recovery.reset.requestNewLink')}
        </Link>
      </>,
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(flowError(language, 'weakPassword'))
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
        setError(flowError(language, 'weakPassword'))
      } else {
        setError(flowError(language, 'network'))
      }
    } finally {
      setLoading(false)
    }
  }

  return shell(
    <>
      <p className="text-ink-muted mb-8">{t('portal.recovery.reset.description')}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="portal-reset-password"
            className="block text-sm font-medium text-ink mb-1.5"
          >
            {t('portal.recovery.reset.passwordLabel')}
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
              {t('portal.recovery.reset.submit')}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </>,
  )
}
