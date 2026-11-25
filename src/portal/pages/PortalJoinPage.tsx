import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { doorRefusal, portalApi, PortalApiError } from '../api/portalClient'
import type { JoinCourseCard } from '../types'
import { usePortalSession } from '../stores/session'
import { chooseLanguage } from '../stores/language'
import { isUuid } from '../uuid'
import { loginAddress } from '../signInReturn'
import { isEmailShaped } from '../emailShape'
import { flowError, PASSWORD_MIN_LENGTH } from '../recoveryTexts'
import {
  courseAddress,
  courseLanguageNames,
  isRateLimited,
  joinSentAddress,
  rateLimitedText,
  signupFieldFailure,
  type JoinSentState,
} from '../openCourses'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import { JoinConsent } from '../components/JoinConsent'
import { FormError, FormSuccess, Loading, PublicShell } from '../components/PublicShell'
import { NewTabLink } from '../../components/billing/NewTabLink'
import { siteUrl, SITE_TEXT_LINK_CLASS } from '../../components/site/siteLinks'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { Message } from '../../i18n/Message'
import { enabledLanguages, iso3Of, languageFromCode } from '../../i18n/languages'
import { consentSha256, joinConsentLines } from '../../utils/billingConsent'

type CardState =
  | { kind: 'loading' }
  | { kind: 'ready'; card: JoinCourseCard }
  | { kind: 'invalid' }
  | { kind: 'failed' }

/** A refusal of the card that means the link leads nowhere. */
function cardRefused(err: unknown): boolean {
  return err instanceof PortalApiError && (err.status === 404 || err.status === 422)
}

/**
 * Enrollment by a course link (O-1), `/<tenant>/join/<key>`: the course the
 * link leads to, then either a signup — a login, a password and an email,
 * confirmed by the mailed link before the course opens — or, with a session
 * of this author's portal, one press. Both need the "18 or older" mark and
 * the consent to the terms — to the revision in force the card names.
 */
export function PortalJoinPage() {
  const { tenantId, key = '' } = useParams()
  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }
  return <JoinPage key={`${tenantId}/${key}`} tenantId={tenantId} courseKey={key} />
}

function JoinPage({ tenantId, courseKey }: { tenantId: string; courseKey: string }) {
  const t = useT()
  const token = usePortalSession((s) => s.token)
  const sessionTenant = usePortalSession((s) => s.tenantId)
  const [state, setState] = useState<CardState>({ kind: 'loading' })

  useEffect(() => {
    let live = true
    portalApi
      .joinCard(tenantId, courseKey)
      .then((card) => live && setState({ kind: 'ready', card }))
      .catch((err: unknown) => {
        if (live) setState({ kind: cardRefused(err) ? 'invalid' : 'failed' })
      })
    return () => {
      live = false
    }
  }, [tenantId, courseKey])

  const markInvalid = () => setState({ kind: 'invalid' })

  // The terms changed while the page was open: the card is read again for the
  // revision now in force. True when it was; a link that leads nowhere any
  // more turns the page into the invalid-link page.
  const reloadCard = useCallback(async (): Promise<boolean> => {
    try {
      const card = await portalApi.joinCard(tenantId, courseKey)
      setState({ kind: 'ready', card })
      return true
    } catch (err) {
      if (cardRefused(err)) setState({ kind: 'invalid' })
      return false
    }
  }, [tenantId, courseKey])

  if (state.kind === 'invalid') {
    return <JoinLinkInvalid />
  }
  if (state.kind === 'loading') {
    return (
      <PublicShell title={t('portal.join.title')} wide>
        <Loading />
      </PublicShell>
    )
  }
  if (state.kind === 'failed') {
    return (
      <PublicShell title={t('portal.join.title')} wide>
        <FormError>{t('portal.join.loadFailed')}</FormError>
      </PublicShell>
    )
  }

  const signedIn = token !== null && sessionTenant === tenantId
  const form: JoinFormProps = {
    tenantId,
    courseKey,
    termsVersion: state.card.terms_version,
    onInvalid: markInvalid,
    onTermsChanged: reloadCard,
  }
  return (
    <PublicShell wide>
      <CourseCard card={state.card} />
      {signedIn ? <JoinWithLogin {...form} /> : <SignupForm {...form} />}
    </PublicShell>
  )
}

/** A link that leads nowhere: unknown, closed, or its course gone. */
function JoinLinkInvalid() {
  const t = useT()
  return (
    <PublicShell title={t('portal.join.title')}>
      <p className="text-ink-muted">{t('portal.join.invalid')}</p>
    </PublicShell>
  )
}

function CourseCard({ card }: { card: JoinCourseCard }) {
  const language = useLanguage()
  const t = useT()
  return (
    <section className="mb-8">
      <p className="text-sm text-ink-muted mb-1">{t('portal.join.title')}</p>
      <h2 className="font-display text-2xl text-ink mb-3">{card.course_title}</h2>
      <p className="text-ink">{t('portal.join.author', { author: card.author_name })}</p>
      {card.languages.length > 0 && (
        <p className="text-ink">
          {t('portal.join.languages', {
            languages: courseLanguageNames(language, card.languages),
          })}
        </p>
      )}
      <p className="text-ink-muted mt-3">
        {t('portal.join.free')}{' '}
        <NewTabLink href={siteUrl(language, 'pricing')}>{t('portal.join.prices')}</NewTabLink>
      </p>
    </section>
  )
}

interface JoinFormProps {
  tenantId: string
  courseKey: string
  /** The revision of the terms in force, from the card: the consent is to it. */
  termsVersion: string
  /** The server says the link leads nowhere (any more). */
  onInvalid: () => void
  /** The server says the terms changed: read the card again; true when it was read. */
  onTermsChanged: () => Promise<boolean>
}

/** The two marks of a join, and whether the terms changed since the page opened. */
function useJoinMarks() {
  const [adult, setAdult] = useState(false)
  const [consent, setConsent] = useState(false)
  const [termsUpdated, setTermsUpdated] = useState(false)
  const marks = (
    <JoinConsent
      adult={adult}
      onAdultChange={setAdult}
      consent={consent}
      onConsentChange={setConsent}
      termsUpdated={termsUpdated}
    />
  )
  // The terms changed: the consent is asked again.
  const askAgain = () => {
    setTermsUpdated(true)
    setConsent(false)
  }
  return { marks, ready: adult && consent, askAgain }
}

/** A student with a session of this author's portal: one press. */
function JoinWithLogin({
  tenantId,
  courseKey,
  termsVersion,
  onInvalid,
  onTermsChanged,
}: JoinFormProps) {
  const language = useLanguage()
  const t = useT()
  const navigate = useNavigate()
  const { marks, ready, askAgain } = useJoinMarks()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState<
    { kind: 'already'; courseId: string } | { kind: 'emailRequired' } | null
  >(null)

  const join = async () => {
    setBusy(true)
    setError('')
    setOutcome(null)
    try {
      const res = await portalApi.joinCourse({
        tenant_id: tenantId,
        key: courseKey,
        adult: true,
        terms_version: termsVersion,
        text_sha256: await consentSha256(joinConsentLines(language)),
      })
      if (res.status === 'already_enrolled') {
        setOutcome({ kind: 'already', courseId: res.course_id })
      } else {
        navigate(courseAddress(tenantId, res.course_id), { replace: true })
      }
    } catch (err) {
      const code = doorRefusal(err)?.code
      if (code === 'course_not_found') onInvalid()
      else if (code === 'email_confirmation_required') setOutcome({ kind: 'emailRequired' })
      else if (code === 'terms_changed') {
        if (await onTermsChanged()) askAgain()
        else setError(t('portal.login.network'))
      } else if (isRateLimited(err)) setError(rateLimitedText(language, err))
      // A 401 is the client's: the session is dropped and sign-in brings the
      // student back here.
      else if (!(err instanceof PortalApiError && err.status === 401)) {
        setError(t('portal.login.network'))
      }
    } finally {
      setBusy(false)
    }
  }

  if (outcome?.kind === 'already') {
    return (
      <div className="space-y-4">
        <FormSuccess>{t('portal.join.existing.alreadyEnrolled')}</FormSuccess>
        <Link to={courseAddress(tenantId, outcome.courseId)} className="btn-primary">
          {t('portal.join.existing.goToCourse')}
          <ArrowRight size={18} />
        </Link>
      </div>
    )
  }

  if (outcome?.kind === 'emailRequired') {
    return (
      <div className="space-y-4">
        <p className="text-ink">{t('portal.join.existing.emailRequired')}</p>
        <Link to={`/${tenantId}/home`} className="btn-primary">
          {t('portal.join.existing.goHome')}
          <ArrowRight size={18} />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-ink-muted">{t('portal.join.existing.lead')}</p>
      {marks}
      {error && <FormError>{error}</FormError>}
      <button
        type="button"
        onClick={() => void join()}
        disabled={busy || !ready}
        className="btn-primary w-full btn-lg"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : t('portal.join.existing.submit')}
      </button>
    </div>
  )
}

/** A newcomer: a login of their own, confirmed by the email before the course opens. */
function SignupForm({
  tenantId,
  courseKey,
  termsVersion,
  onInvalid,
  onTermsChanged,
}: JoinFormProps) {
  const language = useLanguage()
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { marks, ready, askAgain } = useJoinMarks()

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [error, setError] = useState('')

  const filled = login.trim() !== '' && password !== '' && email.trim() !== ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!filled || !ready || busy) return
    setLoginError('')
    setError('')
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(flowError(language, 'weakPassword'))
      return
    }
    if (!isEmailShaped(email.trim())) {
      setError(flowError(language, 'invalidEmail'))
      return
    }
    setBusy(true)
    try {
      const res = await portalApi.joinSignup(tenantId, courseKey, {
        login: login.trim(),
        password,
        email: email.trim(),
        display_name: displayName.trim() || null,
        interface_language: iso3Of(language),
        adult: true,
        terms_version: termsVersion,
        text_sha256: await consentSha256(joinConsentLines(language)),
      })
      const sent: JoinSentState = { emailMasked: res.email_masked }
      navigate(joinSentAddress(tenantId, courseKey, res.signup_id), {
        replace: true,
        state: sent,
      })
    } catch (err) {
      const code = doorRefusal(err)?.code
      const field = signupFieldFailure(err)
      if (code === 'course_not_found') onInvalid()
      else if (code === 'login_taken') setLoginError(t('portal.join.signup.loginTaken'))
      else if (code === 'terms_changed') {
        if (await onTermsChanged()) askAgain()
        else setError(t('portal.login.network'))
      } else if (isRateLimited(err)) setError(rateLimitedText(language, err))
      else if (field === 'invalidForm') setError(t('portal.join.signup.invalidForm'))
      else if (field !== null) setError(flowError(language, field))
      else setError(t('portal.login.network'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-ink-muted">
        <Message
          id="portal.join.haveLogin"
          values={{
            login: (chunks) => (
              <Link to={loginAddress(tenantId, pathname)} className={SITE_TEXT_LINK_CLASS}>
                {chunks}
              </Link>
            ),
          }}
        />
      </p>

      <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
        <h3 className="font-display text-lg text-ink">{t('portal.join.signup.title')}</h3>

        <div>
          <label htmlFor="join-login" className="block text-sm font-medium text-ink mb-1.5">
            {t('portal.join.signup.loginLabel')}
          </label>
          <input
            id="join-login"
            type="text"
            autoComplete="username"
            className="input"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            aria-invalid={loginError !== ''}
            aria-describedby={loginError ? 'join-login-error' : undefined}
          />
          {loginError && (
            <p id="join-login-error" role="alert" className="mt-1.5 text-sm text-coral">
              {loginError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="join-password" className="block text-sm font-medium text-ink mb-1.5">
            {t('portal.join.signup.passwordLabel')}
          </label>
          <input
            id="join-password"
            type="password"
            autoComplete="new-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="join-password-hint"
          />
          <p id="join-password-hint" className="mt-1.5 text-sm text-ink-muted">
            {t('portal.join.signup.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          </p>
        </div>

        <div>
          <label htmlFor="join-email" className="block text-sm font-medium text-ink mb-1.5">
            {t('portal.join.signup.emailLabel')}
          </label>
          <input
            id="join-email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="join-email-hint"
          />
          <p id="join-email-hint" className="mt-1.5 text-sm text-ink-muted">
            {t('portal.join.signup.emailHint')}
          </p>
        </div>

        <div>
          <label htmlFor="join-name" className="block text-sm font-medium text-ink mb-1.5">
            {t('portal.join.signup.nameLabel')}
          </label>
          <input
            id="join-name"
            type="text"
            autoComplete="name"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="join-language" className="block text-sm font-medium text-ink mb-1.5">
            {t('portal.join.signup.languageLabel')}
          </label>
          {/* The language of the pages: choosing one here switches them, as the switcher does. */}
          <select
            id="join-language"
            className="input"
            value={language}
            onChange={(e) => {
              const chosen = languageFromCode(e.target.value)
              if (chosen !== null) chooseLanguage(chosen)
            }}
          >
            {enabledLanguages().map(({ code, htmlLang, nativeName }) => (
              <option key={code} value={code} lang={htmlLang}>
                {nativeName}
              </option>
            ))}
          </select>
        </div>

        {marks}

        {error && <FormError>{error}</FormError>}

        <button
          type="submit"
          disabled={busy || !filled || !ready}
          className="btn-primary w-full btn-lg"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {t('portal.join.signup.submit')}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
