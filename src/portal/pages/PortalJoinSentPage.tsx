import { useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { doorRefusal, portalApi, PortalApiError } from '../api/portalClient'
import { isUuid } from '../uuid'
import { loginAddress } from '../signInReturn'
import { useCountdown } from '../hooks/useCountdown'
import {
  isRateLimited,
  joinAddress,
  rateLimitedText,
  RESEND_PAUSE_SECONDS,
  type JoinSentState,
} from '../openCourses'
import { InvalidPortalLink } from '../components/InvalidPortalLink'
import { FormError, FormSuccess, PublicShell } from '../components/PublicShell'
import { useLanguage, useT } from '../../i18n/LanguageContext'

function sentState(state: unknown): JoinSentState | null {
  const emailMasked = (state as { emailMasked?: unknown } | null)?.emailMasked
  return typeof emailMasked === 'string' ? { emailMasked } : null
}

/**
 * "Confirm your email" after a signup (O-1), `/<tenant>/join/<key>/sent?signup=<id>`.
 * The request travels in the address, so the page outlives a reload; the
 * masked email comes with the signup's answer (the history entry keeps it).
 * The course is not shown until the email is confirmed.
 */
export function PortalJoinSentPage() {
  const { tenantId, key = '' } = useParams()
  const [search] = useSearchParams()
  const signupId = search.get('signup') ?? undefined
  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }
  if (!isUuid(signupId)) {
    return <Navigate to={joinAddress(tenantId, key)} replace />
  }
  return <JoinSent tenantId={tenantId} courseKey={key} signupId={signupId} />
}

function JoinSent({
  tenantId,
  courseKey,
  signupId,
}: {
  tenantId: string
  courseKey: string
  signupId: string
}) {
  const language = useLanguage()
  const t = useT()
  const location = useLocation()
  const [emailMasked, setEmailMasked] = useState(() => sentState(location.state)?.emailMasked ?? null)
  const [wait, startWait] = useCountdown(RESEND_PAUSE_SECONDS)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)
  const [limited, setLimited] = useState('')
  const [error, setError] = useState('')
  const [gone, setGone] = useState(false)

  const resend = async () => {
    setBusy(true)
    setResent(false)
    setLimited('')
    setError('')
    try {
      const res = await portalApi.joinResend(signupId)
      setEmailMasked(res.email_masked)
      setResent(true)
      startWait(RESEND_PAUSE_SECONDS)
    } catch (err) {
      if (doorRefusal(err)?.code === 'signup_not_found') {
        setGone(true)
      } else if (isRateLimited(err)) {
        setLimited(rateLimitedText(language, err))
        startWait((err as PortalApiError).retryAfter ?? RESEND_PAUSE_SECONDS)
      } else {
        setError(t('portal.login.network'))
      }
    } finally {
      setBusy(false)
    }
  }

  if (gone) {
    return (
      <PublicShell title={t('portal.join.sent.title')}>
        <p className="text-ink-muted mb-6">{t('portal.join.sent.notFound')}</p>
        <div className="flex flex-wrap gap-3">
          <Link to={joinAddress(tenantId, courseKey)} className="btn-primary btn-sm">
            {t('portal.join.sent.joinAgain')}
          </Link>
          <Link to={loginAddress(tenantId)} className="btn-secondary btn-sm">
            {t('portal.join.sent.signIn')}
          </Link>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell title={t('portal.join.sent.title')}>
      <div className="space-y-3 text-ink">
        {emailMasked && <p className="font-medium">{t('portal.join.sent.email', { email: emailMasked })}</p>}
        <p>{t('portal.join.sent.lead')}</p>
        <p className="text-ink-muted">{t('portal.join.sent.noAccess')}</p>
      </div>

      <div className="mt-8 space-y-3">
        {resent && <FormSuccess>{t('portal.join.sent.resent')}</FormSuccess>}
        {error && <FormError>{error}</FormError>}
        {limited && wait > 0 ? (
          <FormError>{limited}</FormError>
        ) : (
          wait > 0 && (
            <p role="status" className="text-sm text-ink-muted">
              {t('portal.join.sent.wait', { seconds: wait })}
            </p>
          )
        )}
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy || wait > 0}
          className="btn-secondary w-full"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {t('portal.join.sent.resend')}
        </button>
      </div>
    </PublicShell>
  )
}
