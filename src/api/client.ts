import { useAuthStore } from '../stores/auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Shared transport helpers ──
// Both the read client (fetch, below) and the file-send primitive
// (``upload.ts``, XMLHttpRequest) go through these, so the send path is not a
// second copy of the key precondition, the URL prefix, or — the load-bearing
// one — the error-body normalization the rejection readers depend on (Е1).

/** Resolve the API key or throw the same 401 both transports use. */
export function resolveApiKeyOrThrow(): string {
  const apiKey = useAuthStore.getState().apiKey
  if (!apiKey) throw new ApiError(401, 'No API key')
  return apiKey
}

/** Absolute request URL. */
export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`
}

/**
 * Single source of the rejection shape for BOTH transports: HTTP status plus
 * the response body parsed as JSON (null when empty or not JSON). ``rawBody``
 * is the raw response text — fetch reads it via ``res.text()``, XHR via
 * ``responseText`` — so the parsed ``ApiError.body`` is identical whichever
 * path failed. A copy of this would be a second truth about the error shape.
 */
export function apiErrorFromBody(
  status: number,
  rawBody: string | null,
): ApiError {
  let body: unknown = null
  if (rawBody) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = null
    }
  }
  return new ApiError(status, `API error ${status}`, body)
}

interface Outgoing {
  method?: string
  body?: BodyInit
  contentType?: string
}

/**
 * The one step every call of this client takes: the key, the URL and a
 * refusal turned into ``ApiError`` with its body. Reading the answer is the
 * caller's — JSON for most routes, text for a file a route serves.
 */
async function send(
  path: string,
  { contentType, ...init }: Outgoing = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'X-API-Key': resolveApiKeyOrThrow(),
  }
  if (contentType) headers['Content-Type'] = contentType

  const res = await fetch(apiUrl(path), { ...init, headers })

  if (!res.ok) {
    throw apiErrorFromBody(res.status, await res.text().catch(() => null))
  }
  return res
}

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  return res.json()
}

async function request<T>(
  path: string,
  init: Omit<Outgoing, 'contentType'> = {},
): Promise<T> {
  // Don't set Content-Type for FormData (browser sets it with boundary)
  const contentType =
    init.body instanceof FormData ? undefined : 'application/json'
  return readJson<T>(await send(path, { ...init, contentType }))
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  /** GET an answer that is text, not JSON — a file a route serves. */
  getText: async (path: string): Promise<string> =>
    (await send(path)).text(),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  /** PUT a body that is not JSON under its own type; the answer is JSON. */
  putText: async <T>(path: string, body: Blob | string, contentType: string) =>
    readJson<T>(await send(path, { method: 'PUT', body, contentType })),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

export { ApiError }
