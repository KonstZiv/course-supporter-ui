import { api, ApiError } from './client'
import type {
  AuthorEstimateResponse,
  BillingBalanceResponse,
  BillingCheckoutResponse,
  BillingCheckoutStateResponse,
  BillingConsentResponse,
  BillingOutlookResponse,
  BillingPackagesResponse,
  BillingSpendingResponse,
  BillingStatementResponse,
  BillingStudentsMoneyResponse,
  BillingTermsResponse,
  ProcessingEstimateRequest,
} from '../types/api'

// The author's units (backend `api/routes/billing.py`): terms and consent,
// packages and checkout, the checkout's state, balance and statement; the
// reminders (`billing_outlook.py`), the prices before an action
// (`billing_estimates.py`) and the spending in units. Same author `X-API-Key`
// as every other route.

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

/** The reminders and the students' reviews waiting for units. */
export const billingOutlook = () =>
  api.get<BillingOutlookResponse>(`${BASE}/outlook`)

function periodQuery(from?: string, to?: string): string {
  const query = new URLSearchParams()
  if (from) query.set('from', from)
  if (to) query.set('to', to)
  const search = query.toString()
  return search ? `?${search}` : ''
}

/**
 * The spending in units of a period: inclusive UTC days, YYYY-MM-DD. Without
 * them the server takes the current month.
 */
export const billingSpending = (from?: string, to?: string) =>
  api.get<BillingSpendingResponse>(`${BASE}/spending${periodQuery(from, to)}`)

/**
 * What the author's students paid for reviews from their own accounts:
 * inclusive UTC days, YYYY-MM-DD. Without them the server takes the current month.
 */
export const billingStudentsMoney = (from?: string, to?: string) =>
  api.get<BillingStudentsMoneyResponse>(
    `${BASE}/students-money${periodQuery(from, to)}`,
  )

/** The price of processing a material of the node, from its features. */
export const estimateProcessing = (
  nodeId: string,
  body: ProcessingEstimateRequest,
) =>
  api.post<AuthorEstimateResponse>(
    `/api/v1/nodes/${encodeURIComponent(nodeId)}/documents/estimate`,
    body,
  )

/** The price of the explanations of a test's key. */
export const estimateKeyExplanation = (documentId: string) =>
  api.post<AuthorEstimateResponse>(
    `/api/v1/documents/${encodeURIComponent(documentId)}/reference/estimate`,
  )

/** The price of regenerating section descriptions under the node. */
export const estimateNodeSummary = (nodeId: string, force: boolean) =>
  api.post<AuthorEstimateResponse>(
    `/api/v1/nodes/${encodeURIComponent(nodeId)}/summary/estimate`,
    { force },
  )

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
