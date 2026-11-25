import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalEmailLoginChoice, PortalEmailLoginResponse } from '../types'
import { usePortalSession } from '../stores/session'
import { applySignInLanguage } from '../stores/language'
import { afterSignIn, nextOf } from '../signInReturn'
import { isEmailShaped } from '../emailShape'
import { flowError } from '../recoveryTexts'
import { isRateLimited, rateLimitedText } from '../openCourses'
import { FormError, PublicShell } from '../components/PublicShell'
import { useLanguage, useT } from '../../i18n/LanguageContext'

/**
 * The shared sign-in, `/login` (O-1, variant A): a confirmed email and the
 * password. The server checks the password against every login with this
 * email; when it fits several, the student picks the author and the login,
 * and the password is checked again for that one. Sign-in leads to `next`
 * when it is a page of the very portal signed in to, else to its home.
 */
export function PortalEmailLoginPage() {
  const language = useLanguage()
  const t = useT()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const next = nextOf(search)
  const token = usePortalSession((s) => s.token)
  const sessionTenant = usePortalSession((s) => s.tenantId)
  const setSession = usePortalSession((s) => s.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [choices, setChoices] = useState<PortalEmailLoginChoice[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Already signed in, and `next` (if any) is a page of that portal → there.
  if (token && sessionTenant) {
    const target = afterSignIn(sessionTenant, next)
    if (next === null || target === next) {
      return <Navigate to={target} replace />
    }
  }

  const signIn = (res: PortalEmailLoginResponse) => {
    setSession({
      token: res.access_token,
      tenantId: res.tenant_id,
      studentId: res.student_id,
      displayName: res.display_name,
    })
    applySignInLanguage(res.access_token, res.interface_language)
    navigate(afterSignIn(res.tenant_id, next), { replace: true })
  }

  const send = async (choice?: PortalEmailLoginChoice) => {
    setBusy(true)
    setError('')
    try {
      const res = await portalApi.loginByEmail({
        email: email.trim(),
        password,
        ...(choice ? { tenant_id: choice.tenant_id, login: choice.login } : {}),
      })
      if ('choose' in res) setChoices(res.choose)
      else signIn(res)
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) {
        setChoices(null)
        setError(t('portal.emailLogin.wrongCredentials'))
      } else if (isRateLimited(err)) {
        setError(rateLimitedText(language, err))
      } else if (err instanceof PortalApiError && err.status === 422) {
        setError(flowError(language, 'invalidEmail'))
      } else {
        setError(t('portal.login.network'))
      }
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password || busy) return
    if (!isEmailShaped(email.trim())) {
      setError(flowError(language, 'invalidEmail'))
      return
    }
    void send()
  }

  if (choices !== null) {
    return (
      <PublicShell title={t('portal.emailLogin.chooseTitle')}>
        <p className="text-ink-muted mb-6">{t('portal.emailLogin.chooseLead')}</p>
        <ul className="space-y-2 mb-6">
          {choices.map((choice) => (
            <li key={`${choice.tenant_id}/${choice.login}`}>
              <button
                type="button"
                onClick={() => void send(choice)}
                disabled={busy}
                className="btn-secondary w-full justify-between"
              >
                {t('portal.emailLogin.choice', {
                  author: choice.tenant_name,
                  login: choice.login,
                })}
                <ArrowRight size={18} />
              </button>
            </li>
          ))}
        </ul>
        {error && <FormError className="mb-4">{error}</FormError>}
        <button
          type="button"
          onClick={() => {
            setChoices(null)
            setError('')
          }}
          className="btn-ghost btn-sm"
        >
          {t('portal.emailLogin.back')}
        </button>
      </PublicShell>
    )
  }

  return (
    <PublicShell title={t('portal.emailLogin.title')}>
      <p className="text-ink-muted mb-8">{t('portal.emailLogin.lead')}</p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email-login-email" className="block text-sm font-medium text-ink mb-1.5">
            {t('portal.emailLogin.emailLabel')}
          </label>
          <input
            id="email-login-email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="email-login-password"
            className="block text-sm font-medium text-ink mb-1.5"
          >
            {t('portal.emailLogin.passwordLabel')}
          </label>
          <input
            id="email-login-password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <FormError>{error}</FormError>}

        <button
          type="submit"
          disabled={busy || !email.trim() || !password}
          className="btn-primary w-full btn-lg"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {t('portal.emailLogin.submit')}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-ink-muted mt-6">{t('portal.emailLogin.noEmail')}</p>
    </PublicShell>
  )
}
