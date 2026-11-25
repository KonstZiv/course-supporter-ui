import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { doorRefusal, portalApi, PortalApiError, refusedSignupId } from '../api/portalClient'
import type { JoinConfirmResponse } from '../types'
import { usePortalSession } from '../stores/session'
import { applySignInLanguage } from '../stores/language'
import { isUuid } from '../uuid'
import { loginAddress } from '../signInReturn'
import { flowError } from '../recoveryTexts'
import { courseAddress, isRateLimited, rateLimitedText } from '../openCourses'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import { FormError, PublicShell } from '../components/PublicShell'
import { SITE_TEXT_LINK_CLASS } from '../../components/site/siteLinks'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { Message } from '../../i18n/Message'

/**
 * The link of the confirm email (O-1), `/<tenant>/join/confirm?token=…`. The
 * token is spent by an explicit press, never on load — as on the recovery
 * email's page: a mail scanner that opens links must not spend it. Confirmed:
 * a session, as after sign-in, and the course. A login someone took since the
 * signup: another one, with the same token, then the confirm again.
 */
export function PortalJoinConfirmPage() {
  const { tenantId } = useParams()
  const [search] = useSearchParams()
  const token = search.get('token')
  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }
  return <JoinConfirm tenantId={tenantId} token={token} />
}

function JoinConfirm({ tenantId, token }: { tenantId: string; token: string | null }) {
  const language = useLanguage()
  const t = useT()
  const navigate = useNavigate()
  const setSession = usePortalSession((s) => s.setSession)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState(token === null || token === '')
  // The request whose login was taken: another login is asked for it.
  const [takenSignup, setTakenSignup] = useState<string | null>(null)
  const [newLogin, setNewLogin] = useState('')
  const [loginError, setLoginError] = useState('')

  const signIn = (res: JoinConfirmResponse) => {
    setSession({
      token: res.access_token,
      tenantId: res.tenant_id,
      studentId: res.student_id,
      displayName: res.display_name,
    })
    applySignInLanguage(res.access_token, res.interface_language)
    navigate(courseAddress(res.tenant_id, res.course_id), { replace: true })
  }

  // The failure of a confirm or of a new login, said on the page.
  const fail = (err: unknown) => {
    const code = doorRefusal(err)?.code
    if (code === 'login_taken') {
      const signupId = refusedSignupId(err)
      if (takenSignup !== null) setLoginError(t('portal.join.signup.loginTaken'))
      else if (signupId !== null) setTakenSignup(signupId)
      else setInvalid(true)
    } else if (code === 'signup_not_found' || (err instanceof PortalApiError && err.status === 404)) {
      setInvalid(true)
    } else if (isRateLimited(err)) {
      setError(rateLimitedText(language, err))
    } else {
      setError(flowError(language, 'network'))
    }
  }

  const confirm = async () => {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      signIn(await portalApi.joinConfirm(token))
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const changeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const login = newLogin.trim()
    if (!token || takenSignup === null || login === '') return
    setBusy(true)
    setError('')
    setLoginError('')
    try {
      await portalApi.joinChangeLogin(takenSignup, { login, token })
      signIn(await portalApi.joinConfirm(token))
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  if (invalid) {
    return (
      <PublicShell title={t('portal.join.confirm.title')}>
        <FormError className="mb-3">
          {token ? t('portal.join.confirm.invalid') : flowError(language, 'missingToken')}
        </FormError>
        <p className="text-sm text-ink-muted">
          <Message
            id="portal.join.confirm.invalidHint"
            values={{
              login: (chunks) => (
                <Link to={loginAddress(tenantId)} className={SITE_TEXT_LINK_CLASS}>
                  {chunks}
                </Link>
              ),
            }}
          />
        </p>
      </PublicShell>
    )
  }

  if (takenSignup !== null) {
    return (
      <PublicShell title={t('portal.join.confirm.title')}>
        <p className="text-ink-muted mb-6">{t('portal.join.confirm.loginTaken')}</p>
        <form onSubmit={(e) => void changeLogin(e)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="join-new-login" className="block text-sm font-medium text-ink mb-1.5">
              {t('portal.join.confirm.newLoginLabel')}
            </label>
            <input
              id="join-new-login"
              type="text"
              autoComplete="username"
              className="input"
              value={newLogin}
              onChange={(e) => setNewLogin(e.target.value)}
              aria-invalid={loginError !== ''}
              autoFocus
            />
            {loginError && (
              <p role="alert" className="mt-1.5 text-sm text-coral">
                {loginError}
              </p>
            )}
          </div>
          {error && <FormError>{error}</FormError>}
          <button
            type="submit"
            disabled={busy || newLogin.trim() === ''}
            className="btn-primary w-full btn-lg"
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              t('portal.join.confirm.newLoginSubmit')
            )}
          </button>
        </form>
      </PublicShell>
    )
  }

  return (
    <PublicShell title={t('portal.join.confirm.title')}>
      <p className="text-ink-muted mb-8">{t('portal.join.confirm.description')}</p>
      {error && <FormError className="mb-4">{error}</FormError>}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy}
        className="btn-primary w-full btn-lg"
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            {t('portal.join.confirm.submit')}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </PublicShell>
  )
}
