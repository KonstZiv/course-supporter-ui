import { usePortalSession } from '../stores/session'
import { loginAddress } from '../signInReturn'
import {
  reportHttpFailure,
  reportNetworkError,
  useServiceStatus,
} from '../../serviceStatus/store'
import type {
  ConfirmRecoveryEmailRequest,
  CreateRemarkComment,
  FeedbackTouch,
  FeedbackValue,
  ForgotPasswordRequest,
  JoinChangeLoginRequest,
  JoinConfirmResponse,
  JoinCourseCard,
  JoinSignupRequest,
  JoinSignupResponse,
  PortalBaseDownload,
  PortalBillingBalance,
  PortalBillingCheckout,
  PortalBillingCheckoutRequest,
  PortalBillingCheckoutState,
  PortalBillingConsent,
  PortalBillingConsentRequest,
  PortalBillingOutlook,
  PortalBillingPackages,
  PortalBillingStatement,
  PortalBillingTerms,
  PortalCourseJoinRequest,
  PortalCourseJoinResponse,
  PortalCourseListItem,
  PortalDoorRefusal,
  PortalEmailLoginChoiceResponse,
  PortalEmailLoginRequest,
  PortalEmailLoginResponse,
  PortalInterfaceLanguage,
  PortalInterfaceLanguageRequest,
  PortalLanguagesResponse,
  PortalLoginRequest,
  PortalLoginResponse,
  PortalMaterialTreeNode,
  SubmissionPolicyResponse,
  PortalMe,
  PortalMediaResponse,
  PortalReviewEstimate,
  PortalSubmissionDetail,
  PortalSubmissionListItem,
  PortalSubmitResponse,
  PortalTestSubmitRequest,
  PortalTouchRequest,
  PortalUnitsShortfall,
  RecoveryEmailRequest,
  RecoveryEmailResponse,
  RemarkComment,
  RemarkThreads,
  ResetPasswordRequest,
  TestStructureResponse,
} from '../types'

// Bearer session client for the student portal (Phase 6 / T4b). A sibling to
// the author app's ``api/client.ts`` — NOT a reuse: ``request()`` is hard-
// bound to the apiKey store and the ``X-API-Key`` header. This client attaches
// ``Authorization: Bearer <token>`` from the portal session store instead.
//
// Same base-URL convention as the author client: empty ``VITE_API_BASE_URL``
// in dev resolves to relative ``/api/v1/...`` paths, which the existing Vite
// ``/api`` proxy forwards cross-origin. Portal endpoints live under
// ``/api/v1/portal/*`` (backend mounts the portal routers with that prefix),
// so the existing proxy already covers them — no new dev proxy entry.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class PortalApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
    // A 429's ``Retry-After``, in seconds; null when the answer had none.
    public retryAfter: number | null = null,
  ) {
    super(message)
    this.name = 'PortalApiError'
  }
}

// Lazy session invalidation (ratify Q5): redirect to the tenant's login, with
// the current page as ``next`` so sign-in brings the student back to it
// (``signInReturn``). Uses a full-page navigation because the client lives
// outside the React tree. The guard avoids a redirect loop when already on
// the login page.
function redirectToLogin(tenantId: string | null): void {
  const { pathname, search } = window.location
  if (!tenantId) {
    if (pathname !== '/') window.location.assign('/')
    return
  }
  if (pathname !== loginAddress(tenantId)) {
    window.location.assign(loginAddress(tenantId, pathname + search))
  }
}

// Lines on one page of the student's statement, as on the author's.
const STATEMENT_PAGE_SIZE = 50

// ``Retry-After`` in seconds (the server sends a whole number), or null.
function retryAfterOf(res: Response): number | null {
  const raw = res.headers?.get('Retry-After')
  if (raw === null || raw === undefined || !/^\d+$/.test(raw.trim())) return null
  return Number(raw.trim())
}

async function parseError(res: Response): Promise<PortalApiError> {
  const body = await res.json().catch(() => null)
  return new PortalApiError(res.status, `portal api ${res.status}`, body, retryAfterOf(res))
}

// The door's refusal a failed call carried, or null when it carried none: a
// plain-string ``detail`` (an access 404, a readiness 409), an object without a
// string ``code``, or a failure that is not an API error at all. The caller
// picks its words by ``code``; ``details`` is kept for logs, not for students.
export function doorRefusal(err: unknown): PortalDoorRefusal | null {
  if (!(err instanceof PortalApiError)) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (detail === null || typeof detail !== 'object') return null
  const { code, details } = detail as { code?: unknown; details?: unknown }
  if (typeof code !== 'string') return null
  return { code, details: typeof details === 'string' ? details : null }
}

export interface ReplyRefusal {
  code: string
  details: Record<string, unknown>
}

// Refusal on a remark reply (task 12a). Unlike doorRefusal, details is an
// object (e.g. { max: 5 }, { category: '...' }) instead of a string.
export function replyRefusal(err: unknown): ReplyRefusal | null {
  if (!(err instanceof PortalApiError)) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (detail === null || typeof detail !== 'object') return null
  const { code, details } = detail as { code?: unknown; details?: unknown }
  if (typeof code !== 'string') return null
  const detailsObj =
    details !== null && typeof details === 'object' && !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : {}
  return { code, details: detailsObj }
}

// Unauthenticated login. Does NOT attach a bearer and does NOT trigger the
// 401 redirect — the caller (login page) renders the failure inline.
export async function portalLogin(
  req: PortalLoginRequest,
): Promise<PortalLoginResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json() as Promise<PortalLoginResponse>
}

// Unauthenticated JSON POST for the public recovery flow (R3): forgot / reset /
// confirm. Like portalLogin it attaches NO bearer and does NOT trigger the 401
// redirect — the caller renders failures inline. The success responses are
// empty (202/204), so this is void: the body is read ONLY to build the error.
async function postPublicJson(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
}

// Unauthenticated JSON request that answers with a body (open courses, O-1):
// the course card, the signup and its resend, the confirm, the login by email.
// No bearer, no 401 redirect — the caller renders every failure inline. A 204
// answers ``undefined``. Reports the service state like the bearer calls do.
async function publicJson<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(
      `${BASE_URL}${path}`,
      body === undefined
        ? undefined
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    )
  } catch (err) {
    reportNetworkError(err)
    throw err
  }
  if (!res.ok) {
    const apiError = await parseError(res)
    // A 503 ``service_updating`` raises the same "service is updating" state
    // (with its Retry-After) as every bearer call; the caller still renders
    // the failure inline.
    reportHttpFailure(
      res.status,
      apiError.body,
      res.headers?.get?.('Retry-After'),
    )
    throw apiError
  }
  useServiceStatus.getState().recover()
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function authFetch<T>(
  path: string,
  init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {},
): Promise<T> {
  const { token, tenantId } = usePortalSession.getState()
  if (!token) {
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'No portal session')
  }
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    reportNetworkError(err)
    throw err
  }
  if (res.status === 401) {
    usePortalSession.getState().clear()
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'Portal session expired')
  }
  if (!res.ok) {
    const apiError = await parseError(res)
    reportHttpFailure(
      res.status,
      apiError.body,
      res.headers?.get?.('Retry-After'),
    )
    throw apiError
  }
  useServiceStatus.getState().recover()
  return res.json() as Promise<T>
}

// Authenticated GET. Attaches the bearer; on 401 clears the session and
// redirects to login (the contract c2/c3 inherit for every bearer call).
function authGet<T>(path: string): Promise<T> {
  return authFetch<T>(path)
}

// Authenticated multipart POST (c3a). Sends FormData WITHOUT a Content-Type
// header so the browser sets the multipart boundary (mirrors the author client).
// Same bearer + 401-clear-redirect contract as authGet; non-401 errors (422
// validation, 409 readiness, network) throw a PortalApiError the caller renders
// inline.
function authPost<T>(path: string, body: FormData): Promise<T> {
  return authFetch<T>(path, { method: 'POST', body })
}

// Authenticated JSON request (R3): the recovery-email set/change, the
// interface language. Same bearer + 401-clear-redirect contract as
// authGet/authPost, but a JSON body (authPost is multipart-only for file
// submission). Returns the parsed 200 body; non-401 errors (422 validation)
// throw for inline rendering.
function sendAuthJson<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
): Promise<T> {
  return authFetch<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const postAuthJson = <T>(path: string, body: unknown) => sendAuthJson<T>('POST', path, body)

export const portalApi = {
  me: () => authGet<PortalMe>('/api/v1/portal/me'),
  // Г-1: the language of the pages, kept in the student's account. The server
  // answers with what it now keeps, in three letters ("eng").
  setInterfaceLanguage: (language: string) =>
    sendAuthJson<PortalInterfaceLanguage>('PUT', '/api/v1/portal/me/interface-language', {
      language,
    } satisfies PortalInterfaceLanguageRequest),
  submitTask: (taskId: string, body: FormData) =>
    authPost<PortalSubmitResponse>(
      `/api/v1/portal/tasks/${taskId}/submissions`,
      body,
    ),
  // Task 07: a test is answered with its answers, not a file. The structure
  // carries nothing of the key; the answers go as JSON, and a door that
  // refuses them names its reason — read it with ``doorRefusal``.
  testStructure: (taskId: string) =>
    authGet<TestStructureResponse>(`/api/v1/portal/tasks/${taskId}/test`),
  // BIL-E: the price of a review of this task before it is sent. Without a
  // file — the task's typical price; with one — the price of that file (read
  // by the doors, never stored). A file the doors refuse is a 422 with their
  // code, as the submission would be: read it with ``doorRefusal``.
  estimateTask: (taskId: string, file?: File | null, responseLanguage?: string | null) => {
    const body = new FormData()
    if (file) body.append('file', file)
    if (responseLanguage) body.append('response_language', responseLanguage)
    return authPost<PortalReviewEstimate>(
      `/api/v1/portal/tasks/${taskId}/estimate`,
      body,
    )
  },
  submitTest: (taskId: string, body: PortalTestSubmitRequest) =>
    postAuthJson<PortalSubmitResponse>(
      `/api/v1/portal/tasks/${taskId}/test-submissions`,
      body,
    ),
  // c2 read-path. All inherit authGet's bearer + 401-clear-redirect contract.
  // Step Г2 §2.1: the language whitelist the review-language field offers.
  // The author's identical route is behind an API-key scope the portal session
  // cannot pass, hence the portal twin server-side; this is its caller.
  languages: () =>
    authGet<PortalLanguagesResponse>('/api/v1/portal/languages'),
  submissionPolicy: () =>
    authGet<SubmissionPolicyResponse>('/api/v1/portal/submission-policy'),
  courses: () => authGet<PortalCourseListItem[]>('/api/v1/portal/courses'),
  courseMaterials: (rootId: string) =>
    authGet<PortalMaterialTreeNode>(
      `/api/v1/portal/courses/${rootId}/materials`,
    ),
  material: (materialId: string) =>
    authGet<PortalMediaResponse>(`/api/v1/portal/materials/${materialId}`),
  // c3b read-path. Own attempts on a task + one attempt's curated detail.
  submissions: (taskId: string) =>
    authGet<PortalSubmissionListItem[]>(
      `/api/v1/portal/tasks/${taskId}/submissions`,
    ),
  submission: (submissionId: string) =>
    authGet<PortalSubmissionDetail>(
      `/api/v1/portal/submissions/${submissionId}`,
    ),
  // Task 12a: Remark comments and replies
  remarkThreads: (submissionId: string) =>
    authGet<RemarkThreads>(
      `/api/v1/portal/submissions/${submissionId}/comments`,
    ),
  replyToRemark: (submissionId: string, req: CreateRemarkComment) =>
    postAuthJson<RemarkComment>(
      `/api/v1/portal/submissions/${submissionId}/comments`,
      req,
    ),
  // KD18 P5: presigned download of a project task's active base ORIGINAL archive
  // (D2 option B — served on demand, not baked into the descriptor). A visible
  // task with no READY base throws a PortalApiError whose body.detail is the
  // distinct "No base is available for this task yet." — the caller tells it
  // apart from an access-failure 404 (body.detail = "Task not found.").
  base: (taskId: string) =>
    authGet<PortalBaseDownload>(`/api/v1/portal/tasks/${taskId}/base`),
  // Task 05: the student's answer about a review. A repeat answer replaces the
  // previous one server-side, so the caller does not track which case it is —
  // it sends the value and gets back what is now stored.
  touchReview: (submissionId: string, value: FeedbackValue) =>
    postAuthJson<FeedbackTouch>(
      `/api/v1/portal/submissions/${submissionId}/feedback`,
      { kind: 'touch', value } satisfies PortalTouchRequest,
    ),
  // R3 password-recovery. Public (no bearer) — forgot always 202; reset/confirm
  // 204 or 400 generic; caller renders inline.
  forgotPassword: (req: ForgotPasswordRequest) =>
    postPublicJson('/api/v1/portal/password/forgot', req),
  resetPassword: (req: ResetPasswordRequest) =>
    postPublicJson('/api/v1/portal/password/reset', req),
  confirmEmail: (req: ConfirmRecoveryEmailRequest) =>
    postPublicJson('/api/v1/portal/recovery-email/confirm', req),
  // Protected — set/change the recovery email (also the resend mechanism:
  // re-POSTing burns the old confirm token and mails a fresh link).
  setRecoveryEmail: (req: RecoveryEmailRequest) =>
    postAuthJson<RecoveryEmailResponse>('/api/v1/portal/recovery-email', req),
  // Open courses (O-1). Public: the course of a link, the signup, a new link,
  // the confirm, another login for a request whose login was taken, the login
  // by email. With the session: a student with a login joins a course. Every
  // refusal is coded — read it with ``doorRefusal``; a 429 carries
  // ``retryAfter``.
  joinCard: (tenantId: string, key: string) =>
    publicJson<JoinCourseCard>(
      `/api/v1/portal/join/${tenantId}/${encodeURIComponent(key)}`,
    ),
  joinSignup: (tenantId: string, key: string, req: JoinSignupRequest) =>
    publicJson<JoinSignupResponse>(
      `/api/v1/portal/join/${tenantId}/${encodeURIComponent(key)}/signup`,
      req,
    ),
  joinResend: (signupId: string) =>
    publicJson<JoinSignupResponse>('/api/v1/portal/join/resend', {
      signup_id: signupId,
    }),
  joinConfirm: (token: string) =>
    publicJson<JoinConfirmResponse>('/api/v1/portal/join/confirm', { token }),
  joinChangeLogin: (signupId: string, req: JoinChangeLoginRequest) =>
    publicJson<void>(`/api/v1/portal/join/${signupId}/login`, req),
  loginByEmail: (req: PortalEmailLoginRequest) =>
    publicJson<PortalEmailLoginResponse | PortalEmailLoginChoiceResponse>(
      '/api/v1/portal/login-by-email',
      req,
    ),
  joinCourse: (req: PortalCourseJoinRequest) =>
    postAuthJson<PortalCourseJoinResponse>('/api/v1/portal/courses/join', req),
  // Units of the student's account (BIL-A, BIL-PAY, BIL-E): the terms and the
  // consent, packages and checkout, the checkout's state, balance, statement,
  // and the outlook. A refusal carries its reason — read it with
  // ``doorRefusal``.
  billingTerms: () =>
    authGet<PortalBillingTerms>('/api/v1/portal/billing/terms'),
  billingConsent: (termsVersion: string, textSha256: string) =>
    postAuthJson<PortalBillingConsent>('/api/v1/portal/billing/consent', {
      terms_version: termsVersion,
      text_sha256: textSha256,
    } satisfies PortalBillingConsentRequest),
  billingPackages: () =>
    authGet<PortalBillingPackages>('/api/v1/portal/billing/packages'),
  billingCheckout: (packageId: string) =>
    postAuthJson<PortalBillingCheckout>('/api/v1/portal/billing/checkout', {
      package_id: packageId,
    } satisfies PortalBillingCheckoutRequest),
  billingCheckoutState: (checkoutRef: string) =>
    authGet<PortalBillingCheckoutState>(
      `/api/v1/portal/billing/checkouts/${encodeURIComponent(checkoutRef)}`,
    ),
  billingBalance: () =>
    authGet<PortalBillingBalance>('/api/v1/portal/billing/balance'),
  billingStatement: (cursor?: string | null) => {
    const query = new URLSearchParams({ limit: String(STATEMENT_PAGE_SIZE) })
    if (cursor) query.set('cursor', cursor)
    return authGet<PortalBillingStatement>(
      `/api/v1/portal/billing/statement?${query}`,
    )
  },
  // Without ``course_id``: only a payment rule for the student counts.
  billingOutlook: () =>
    authGet<PortalBillingOutlook>('/api/v1/portal/billing/outlook'),
}

// The request a ``login_taken`` refusal of the confirm names
// (``detail.signup_id``) — another login is sent for it — or null.
export function refusedSignupId(err: unknown): string | null {
  if (!(err instanceof PortalApiError)) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (detail === null || typeof detail !== 'object') return null
  const { signup_id } = detail as { signup_id?: unknown }
  return typeof signup_id === 'string' ? signup_id : null
}

// The reason code of a billing refusal (``detail.code``), or null.
export function billingReason(err: unknown): string | null {
  return doorRefusal(err)?.code ?? null
}

// The code of a submission refused for want of units.
export const INSUFFICIENT_UNITS = 'insufficient_units'

const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

// The numbers of a 402 ``insufficient_units`` refusal, or null for any other
// failure — and for one whose numbers did not come whole (the caller then
// says what it says of any refusal).
export function unitsShortfall(err: unknown): PortalUnitsShortfall | null {
  if (!(err instanceof PortalApiError) || err.status !== 402) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (detail === null || typeof detail !== 'object') return null
  const { code, details } = detail as { code?: unknown; details?: unknown }
  if (code !== INSUFFICIENT_UNITS || details === null || typeof details !== 'object') {
    return null
  }
  const { price_units, available_units, missing_units } = details as Record<string, unknown>
  if (!isCount(price_units) || !isCount(available_units) || !isCount(missing_units)) {
    return null
  }
  return { price_units, available_units, missing_units }
}
