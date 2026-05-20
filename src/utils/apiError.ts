import { ApiError } from '../api/client'

/**
 * Extracts the human-readable rejection message from a backend
 * SECURITY_REJECTED-shape error body.
 *
 * Backend shape (HTTP 400): { "detail": { "code": "SECURITY_REJECTED",
 *                                          "category": <cat>,
 *                                          "details": <msg> } }
 * Note: inner key `details` is plural (distinct from outer FastAPI `detail`).
 *
 * Returns null when the shape does not match (caller falls back).
 */
export function rejectionDetail(err: unknown): string | null {
  if (err instanceof ApiError && err.body && typeof err.body === 'object') {
    const d = (err.body as { detail?: unknown }).detail
    if (d && typeof d === 'object' && 'details' in d) {
      return String((d as { details: unknown }).details)
    }
  }
  return null
}
