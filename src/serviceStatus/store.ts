import { create } from 'zustand'

export type ServiceStatus = 'ok' | 'updating' | 'unreachable'

const DEFAULT_RETRY_AFTER = 15
const MIN_RETRY_AFTER = 5
const MAX_RETRY_AFTER = 120

/**
 * Parse a `Retry-After` header value (or numeric seconds) into a clamped
 * integer in [5, 120] seconds, falling back to 15 when missing or not an integer.
 */
export function parseRetryAfter(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return DEFAULT_RETRY_AFTER
  let parsed: number
  if (typeof raw === 'number') {
    parsed = raw
  } else {
    const trimmed = raw.trim()
    if (!/^\d+$/.test(trimmed)) return DEFAULT_RETRY_AFTER
    parsed = Number(trimmed)
  }
  if (!Number.isInteger(parsed)) return DEFAULT_RETRY_AFTER
  return Math.min(MAX_RETRY_AFTER, Math.max(MIN_RETRY_AFTER, parsed))
}

/** True when a parsed error body carries `{"detail": "service_updating"}`. */
export function isServiceUpdatingBody(body: unknown): boolean {
  if (body === null || typeof body !== 'object') return false
  return (body as { detail?: unknown }).detail === 'service_updating'
}

export interface ServiceStatusState {
  status: ServiceStatus
  since: number | null
  retryAfter: number
  hasSucceeded: boolean
  recoveryCount: number
  unsaved: boolean
  report: (kind: Exclude<ServiceStatus, 'ok'>, retryAfter?: number | null) => void
  recover: () => void
  setUnsaved: (unsaved: boolean) => void
}

export const useServiceStatus = create<ServiceStatusState>((set) => ({
  status: 'ok',
  since: null,
  retryAfter: DEFAULT_RETRY_AFTER,
  hasSucceeded: false,
  recoveryCount: 0,
  unsaved: false,
  report: (kind, retryAfter) =>
    set((state) => ({
      status: kind,
      since: state.status === 'ok' ? Date.now() : state.since,
      retryAfter:
        kind === 'updating'
          ? parseRetryAfter(retryAfter)
          : DEFAULT_RETRY_AFTER,
    })),
  recover: () =>
    set((state) => {
      if (state.status === 'ok') {
        return state.hasSucceeded ? state : { hasSucceeded: true }
      }
      return {
        status: 'ok',
        since: null,
        hasSucceeded: true,
        recoveryCount: state.unsaved
          ? state.recoveryCount
          : state.recoveryCount + 1,
      }
    }),
  setUnsaved: (unsaved) => set({ unsaved }),
}))

/** Report an HTTP failure from any transport when it indicates update or outage. */
export function reportHttpFailure(
  status: number,
  body: unknown,
  retryAfterHeader?: string | null,
): void {
  if (status === 503 && isServiceUpdatingBody(body)) {
    useServiceStatus
      .getState()
      .report('updating', parseRetryAfter(retryAfterHeader))
    return
  }
  if (status === 502 || status === 504) {
    useServiceStatus.getState().report('unreachable')
  }
}

/** Report a fetch network error (TypeError, excluding AbortError and Node relative-URL errors). */
export function reportNetworkError(err: unknown): void {
  if (
    err instanceof TypeError &&
    err.name !== 'AbortError' &&
    !err.message.includes('Failed to parse URL')
  ) {
    useServiceStatus.getState().report('unreachable')
  }
}
