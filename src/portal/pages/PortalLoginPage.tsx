import { useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { BookOpen, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { usePortalSession } from '../stores/session'
import { portalLogin, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import { PublicPage } from '../components/PublicPage'
import { afterSignIn, nextOf } from '../signInReturn'
import { useT } from '../../i18n/LanguageContext'
import { applySignInLanguage } from '../stores/language'
import { isServiceUpdatingBody } from '../../serviceStatus/store'

// Student portal login (Phase 6 / T4b, c1). The tenant comes from the URL
// segment (ratify Q3) and is sent as ``tenant_id`` in the unauthenticated
// login request — the student has no key, the tenant is resolved before the
// student is known. Mirrors the author LoginPage's raw-fetch approach (the
// bearer client cannot be used pre-token). Sign-in leads back to the address
// the student was opening (``next``) when it is a page of this tenant's
// portal, else home.
export function PortalLoginPage() {
  const { tenantId } = useParams()
  const t = useT()
  const token = usePortalSession((s) => s.token)
  const sessionTenant = usePortalSession((s) => s.tenantId)
  const setSession = usePortalSession((s) => s.setSession)
  const navigate = useNavigate()
  const [search] = useSearchParams()

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }

  const target = afterSignIn(tenantId, nextOf(search))

  // Already signed in for this tenant → straight to the portal.
  if (token && sessionTenant === tenantId) {
    return <Navigate to={target} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!login.trim() || !password) return

    setLoading(true)
    setError('')
    try {
      const res = await portalLogin({
        tenant_id: tenantId,
        login: login.trim(),
        password,
      })
      setSession({
        token: res.access_token,
        tenantId,
        studentId: res.student_id,
        displayName: res.display_name,
      })
      // The language kept in the student's account, or — with none kept —
      // this browser's choice goes there.
      applySignInLanguage(res.access_token, res.interface_language)
      navigate(target, { replace: true })
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        setError(t('portal.login.wrongCredentials'))
      } else if (err instanceof PortalApiError && err.status === 429) {
        setError(t('portal.login.rateLimited'))
      } else if (
        err instanceof PortalApiError &&
        err.status === 503 &&
        isServiceUpdatingBody(err.body)
      ) {
        setError(t('portal.login.error.updating'))
      } else {
        setError(t('portal.login.network'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicPage>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
            <BookOpen size={20} className="text-amber-light" />
          </div>
          <span className="font-display text-2xl text-ink">{t('portal.header.name')}</span>
        </div>

        <h2 className="font-display text-2xl text-ink mb-2">{t('portal.login.title')}</h2>
        <p className="text-ink-muted mb-2">{t('portal.login.lead')}</p>
        <p className="text-ink-muted mb-8">{t('portal.login.saveAddress')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="portal-login" className="block text-sm font-medium text-ink mb-1.5">
              {t('portal.login.loginLabel')}
            </label>
            <input
              id="portal-login"
              type="text"
              className="input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="portal-password" className="block text-sm font-medium text-ink mb-1.5">
              {t('portal.login.passwordLabel')}
            </label>
            <input
              id="portal-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="mt-1.5 text-right">
              <Link
                to={`/${tenantId}/forgot-password`}
                className="text-sm text-ink-muted hover:text-ink"
              >
                {t('portal.login.forgot')}
              </Link>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !login.trim() || !password}
            className="btn-primary w-full btn-lg"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {t('portal.login.submit')}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>
    </PublicPage>
  )
}
