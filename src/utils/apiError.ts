import { ApiError } from '../api/client'
import { ingestErrorMessage } from './ingestErrors'

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
 * The single author-facing door for a document upload / link-add rejection
 * (DD-SP-D). Both authored callers (file upload, link add) route here; it maps
 * the ``{ detail: { code, category, details } }`` envelope by CODE FAMILY:
 *
 *   * ``SECURITY_REJECTED`` → the human dictionary by ``category`` — a raw
 *     Stage-1 ``details`` (e.g. "zero_width U+FEFF at index 0") never reaches
 *     the author;
 *   * ``INTAKE_*`` (video duration / probe) → the backend's ready
 *     product-language ``details`` verbatim (that family already speaks uk);
 *   * any OTHER recognised-code rejection → the generic phrase, so an
 *     unfamiliar family degrades to a polite sentence, never a raw / technical
 *     ``details`` (e.g. the English ``ARCHIVE_REQUIRES_CODE`` text). This is
 *     the same structural guard as the dictionary's own fallback — no branch
 *     leaks raw text.
 *
 * Returns ``null`` only when the error is NOT a coded server rejection (a
 * transport failure, or a bare ``detail`` string / no envelope), so the
 * caller's own context fallback (file label / link message) takes over. It is
 * therefore the sole door for rejection TEXTS; it never returns raw.
 */
export function authoredRejectionMessage(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (!detail || typeof detail !== 'object') return null
  const code = 'code' in detail ? (detail as { code?: unknown }).code : undefined
  if (typeof code !== 'string') return null
  if (code === 'SECURITY_REJECTED') {
    const category =
      'category' in detail ? (detail as { category?: unknown }).category : null
    return ingestErrorMessage(typeof category === 'string' ? category : null)
  }
  if (code.startsWith('INTAKE_')) {
    const details =
      'details' in detail ? (detail as { details?: unknown }).details : null
    return typeof details === 'string' ? details : ingestErrorMessage(null)
  }
  // A recognised envelope with a code we have no specific text for degrades to
  // the generic phrase — never the raw ``details``.
  return ingestErrorMessage(null)
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
