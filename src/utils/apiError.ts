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

/**
 * Human-readable message from a FastAPI 422 validation-error body.
 *
 * Tolerates BOTH runtime forms confirmed by live curl (Task 3.2.5b):
 *   - pydantic array:  { detail: [{ loc, msg, type }, ...] } → joined ``msg``s
 *   - manual string:   { detail: "No editable fields supplied..." } → as-is
 *
 * General FastAPI shape (any ``extra='forbid'`` / validation endpoint emits
 * it), so it lives here next to ``rejectionDetail`` rather than in a feature
 * module. Returns null when the body matches neither form (caller falls back).
 */
export function validationMessage(err: unknown): string | null {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== 'object') {
    return null
  }
  const detail = (err.body as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) =>
        d && typeof d === 'object' ? (d as { msg?: unknown }).msg : null,
      )
      .filter((m): m is string => typeof m === 'string')
    return msgs.length > 0 ? msgs.join('; ') : null
  }
  return null
}
