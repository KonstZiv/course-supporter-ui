import { useAuthStore } from '../stores/auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = useAuthStore.getState().apiKey
  if (!apiKey) throw new ApiError(401, 'No API key')

  const url = `${BASE_URL}${path}`
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
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, `API error ${res.status}`, body)
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
