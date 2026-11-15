import { api, ApiError } from './client'
import type {
  BillingBalanceResponse,
  BillingCheckoutResponse,
  BillingCheckoutStateResponse,
  BillingConsentResponse,
  BillingPackagesResponse,
  BillingStatementResponse,
  BillingTermsResponse,
} from '../types/api'

// The author's units (backend `api/routes/billing.py`): terms and consent,
// packages and checkout, the checkout's state, balance and statement. Same
// author `X-API-Key` as every other route.

const BASE = '/api/v1/billing'

/** Lines on one page of the statement. */
export const STATEMENT_PAGE_SIZE = 50

export const getTerms = () => api.get<BillingTermsResponse>(`${BASE}/terms`)

export const postConsent = (termsVersion: string, textSha256: string) =>
  api.post<BillingConsentResponse>(`${BASE}/consent`, {
    terms_version: termsVersion,
    text_sha256: textSha256,
  })

export const getPackages = () =>
  api.get<BillingPackagesResponse>(`${BASE}/packages`)

export const postCheckout = (packageId: string) =>
  api.post<BillingCheckoutResponse>(`${BASE}/checkout`, {
    package_id: packageId,
  })

export const getCheckout = (checkoutRef: string) =>
  api.get<BillingCheckoutStateResponse>(
    `${BASE}/checkouts/${encodeURIComponent(checkoutRef)}`,
  )

export const getBalance = () =>
  api.get<BillingBalanceResponse>(`${BASE}/balance`)

export const getStatement = (cursor?: string | null) => {
  const query = new URLSearchParams({ limit: String(STATEMENT_PAGE_SIZE) })
  if (cursor) query.set('cursor', cursor)
  return api.get<BillingStatementResponse>(`${BASE}/statement?${query}`)
}

/**
 * The reason code of a billing refusal — `detail.code` of
 * `{ "detail": { "code", "details" } }` — or null when the error is not one
 * (a network failure, another shape). `details` is for the server's logs and
 * never reaches the screen.
 */
export function billingReason(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (!detail || typeof detail !== 'object') return null
  const code = (detail as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}
