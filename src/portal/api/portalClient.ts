import { usePortalSession } from '../stores/session'
import type {
  ConfirmRecoveryEmailRequest,
  ForgotPasswordRequest,
  PortalBaseDownload,
  PortalCourseListItem,
  PortalLoginRequest,
  PortalLoginResponse,
  PortalMaterialTreeNode,
  PortalMe,
  PortalMediaResponse,
  PortalSubmissionDetail,
  PortalSubmissionListItem,
  PortalSubmitResponse,
  RecoveryEmailRequest,
  RecoveryEmailResponse,
  ResetPasswordRequest,
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
  ) {
    super(message)
    this.name = 'PortalApiError'
  }
}

// Lazy session invalidation (ratify Q5): redirect to the tenant's login. Uses
// a full-page navigation because the client lives outside the React tree. The
// guard avoids a redirect loop when already on the login page.
function redirectToLogin(tenantId: string | null): void {
  const target = tenantId ? `/${tenantId}/login` : '/'
  if (window.location.pathname !== target) {
    window.location.assign(target)
  }
}

async function parseError(res: Response): Promise<PortalApiError> {
  const body = await res.json().catch(() => null)
  return new PortalApiError(res.status, `portal api ${res.status}`, body)
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

// Authenticated GET. Attaches the bearer; on 401 clears the session and
// redirects to login (the contract c2/c3 inherit for every bearer call).
async function authGet<T>(path: string): Promise<T> {
  const { token, tenantId } = usePortalSession.getState()
  if (!token) {
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'No portal session')
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    usePortalSession.getState().clear()
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'Portal session expired')
  }
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json() as Promise<T>
}

// Authenticated multipart POST (c3a). Sends FormData WITHOUT a Content-Type
// header so the browser sets the multipart boundary (mirrors the author client).
// Same bearer + 401-clear-redirect contract as authGet; non-401 errors (422
// validation, 409 readiness, network) throw a PortalApiError the caller renders
// inline.
async function authPost<T>(path: string, body: FormData): Promise<T> {
  const { token, tenantId } = usePortalSession.getState()
  if (!token) {
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'No portal session')
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (res.status === 401) {
    usePortalSession.getState().clear()
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'Portal session expired')
  }
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json() as Promise<T>
}

// Authenticated JSON POST (R3): the recovery-email set/change. Same bearer +
// 401-clear-redirect contract as authGet/authPost, but a JSON body (the
// existing authPost is multipart-only for file submission). Returns the parsed
// 200 body; non-401 errors (422 validation) throw for inline rendering.
async function postAuthJson<T>(path: string, body: unknown): Promise<T> {
  const { token, tenantId } = usePortalSession.getState()
  if (!token) {
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'No portal session')
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    usePortalSession.getState().clear()
    redirectToLogin(tenantId)
    throw new PortalApiError(401, 'Portal session expired')
  }
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json() as Promise<T>
}

export const portalApi = {
  me: () => authGet<PortalMe>('/api/v1/portal/me'),
  submitTask: (taskId: string, body: FormData) =>
    authPost<PortalSubmitResponse>(
      `/api/v1/portal/tasks/${taskId}/submissions`,
      body,
    ),
  // c2 read-path. All inherit authGet's bearer + 401-clear-redirect contract.
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
  // KD18 P5: presigned download of a project task's active base ORIGINAL archive
  // (D2 option B — served on demand, not baked into the descriptor). A visible
  // task with no READY base throws a PortalApiError whose body.detail is the
  // distinct "No base is available for this task yet." — the caller tells it
  // apart from an access-failure 404 (body.detail = "Task not found.").
  base: (taskId: string) =>
    authGet<PortalBaseDownload>(`/api/v1/portal/tasks/${taskId}/base`),
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
}
