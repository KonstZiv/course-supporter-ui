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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = resolveApiKeyOrThrow()

  const url = apiUrl(path)
  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    ...((options.headers as Record<string, string>) || {}),
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    throw apiErrorFromBody(res.status, await res.text().catch(() => null))
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

export { ApiError }
