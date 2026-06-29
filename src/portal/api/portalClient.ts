import { usePortalSession } from '../stores/session'
import type {
  PortalCourseListItem,
  PortalLoginRequest,
  PortalLoginResponse,
  PortalMaterialTreeNode,
  PortalMe,
  PortalMediaResponse,
  PortalSubmitResponse,
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
}
