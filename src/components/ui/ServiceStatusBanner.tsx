import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'
import {
  useServiceStatus,
  type ServiceStatus,
} from '../../serviceStatus/store'
import { SUPPORT_ADDRESS } from '../../utils/supportAddress'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const TEN_MINUTES_MS = 10 * 60 * 1000
const LONG_WAIT_SECONDS = 60
const UNREACHABLE_RETRY_SECONDS = 15

function nextIntervalSeconds(
  status: ServiceStatus,
  since: number | null,
  retryAfter: number,
): number {
  if (since !== null && Date.now() - since >= TEN_MINUTES_MS) {
    return LONG_WAIT_SECONDS
  }
  return status === 'updating' ? retryAfter : UNREACHABLE_RETRY_SECONDS
}

export interface ServiceStatusBannerProps {
  /** Render full-width in place of page content when nothing has loaded yet. */
  fullPage?: boolean
}

/**
 * Calm status notice shown when the backend is updating (503 service_updating)
 * or unreachable (network error / 502 / 504). Polls `GET /health` without
 * credentials and recovers automatically when the server responds 200.
 */
export function ServiceStatusBanner({
  fullPage = false,
}: ServiceStatusBannerProps) {
  const status = useServiceStatus((s) => s.status)
  const since = useServiceStatus((s) => s.since)
  const retryAfter = useServiceStatus((s) => s.retryAfter)
  const recover = useServiceStatus((s) => s.recover)
  const t = useT()

  const [seconds, setSeconds] = useState(() =>
    nextIntervalSeconds(status, since, retryAfter),
  )
  const [checking, setChecking] = useState(false)

  const checkingRef = useRef(false)

  useEffect(() => {
    if (status === 'ok') return
    setSeconds(nextIntervalSeconds(status, since, retryAfter))
  }, [status, since, retryAfter])

  const checkHealth = useCallback(async () => {
    if (checkingRef.current || useServiceStatus.getState().status === 'ok') return
    checkingRef.current = true
    setChecking(true)
    try {
      const res = await fetch(`${BASE_URL}/health`)
      if (res.ok) {
        recover()
        return
      }
    } catch {
      // Server still unreachable; schedule the next countdown.
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
    const latest = useServiceStatus.getState()
    if (latest.status !== 'ok') {
      setSeconds(
        nextIntervalSeconds(latest.status, latest.since, latest.retryAfter),
      )
    }
  }, [recover])

  useEffect(() => {
    if (status === 'ok') return
    const id = window.setInterval(() => {
      if (checkingRef.current) return
      setSeconds((prev) => {
        if (prev <= 1) {
          void checkHealth()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [status, checkHealth])

  if (status === 'ok') return null

  const isLongWait = since !== null && Date.now() - since >= TEN_MINUTES_MS
  const title =
    status === 'updating'
      ? t('shared.serviceStatus.updatingTitle')
      : t('shared.serviceStatus.unreachableTitle')
  const body = isLongWait
    ? t('shared.serviceStatus.longWait', { email: SUPPORT_ADDRESS })
    : status === 'updating'
      ? t('shared.serviceStatus.updatingBody', { seconds })
      : t('shared.serviceStatus.unreachableBody', { seconds })

  if (fullPage) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="service-status-banner"
        className="flex-1 flex items-center justify-center px-4 py-12"
      >
        <div className="max-w-xl w-full rounded-2xl bg-amber-pale text-ink border border-amber/40 p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          <p className="text-ink-light">{body}</p>
          <div>
            <button
              type="button"
              onClick={() => void checkHealth()}
              disabled={checking}
              className="btn-primary"
            >
              {checking && (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              )}
              {t('shared.serviceStatus.retryNow')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="service-status-banner"
      className="bg-amber-pale text-ink border-b border-amber/40"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[14rem] space-y-0.5">
          <p className="font-semibold text-ink">{title}</p>
          <p className="text-sm text-ink-light">{body}</p>
        </div>
        <button
          type="button"
          onClick={() => void checkHealth()}
          disabled={checking}
          className="btn-secondary shrink-0"
        >
          {checking && (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          )}
          {t('shared.serviceStatus.retryNow')}
        </button>
      </div>
    </div>
  )
}
