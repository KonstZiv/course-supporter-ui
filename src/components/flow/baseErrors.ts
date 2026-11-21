import { ApiError } from '../../api/client'
import { rejectionDetail, validationMessage } from '../../utils/apiError'
import type { Language } from '../../i18n/languages'
import { translate } from '../../i18n/translate'

// Author-facing phrases for the project-base attach / re-upload write codes.
// The codes are transcribed by hand from the backend HTTPException raises
// (documents.py POST /documents/{id}/base + _read_upload_capped): they are NOT
// in the OpenAPI schema (only 200 / 202 / 422 are auto-declared; every 4xx/413
// here is a runtime raise carrying a { detail: { code, details } } envelope).
//
// This is the 5th instance of the "FE mirrors backend codes" pattern (after
// studentErrors.ts / submissionCodes.ts / terminalStatus.ts et al.). If it
// recurs it is a candidate for OpenAPI-driven codegen rather than another
// hand-written table.
//
// NB: the reader is an OBJECT reader — the code lives at ``body.detail.code``
// (FastAPI nests the raised detail under ``detail``). Do NOT read a top-level
// ``body.code`` (the P5-FE Commit #6 bug — green unit tests against a fiction).

function baseErrorCode(err: ApiError): string | null {
  const detail = (err.body as { detail?: unknown } | null)?.detail
  if (detail && typeof detail === 'object' && 'code' in detail) {
    const code = (detail as { code?: unknown }).code
    return typeof code === 'string' ? code : null
  }
  return null
}

/**
 * Human-readable message for a base attach / re-upload failure.
 *
 * Resolution order: curated phrase by ``detail.code`` → FastAPI-native 422
 * (missing file / validation, array|string ``detail``) via ``validationMessage``
 * → the raw server ``details`` for an unknown code via ``rejectionDetail`` →
 * generic fallback. NO_BASE_ATTACHED (404 on GET) is NOT here — it is
 * control-flow (render the attach slot), never an error toast.
 */
export function baseErrorMessage(language: Language, err: unknown): string {
  if (err instanceof ApiError) {
    const code = baseErrorCode(err)
    if (code === 'BASE_VERSION_CONFLICT') {
      return translate(language, 'panel.flow.baseError.versionConflict')
    }
    if (code === 'UPLOAD_TOO_LARGE') {
      return translate(language, 'panel.flow.baseError.uploadTooLarge')
    }
    if (code === 'NOT_A_PROJECT_TASK') {
      return translate(language, 'panel.flow.baseError.notAProjectTask')
    }
    if (code === 'NOT_AN_ARCHIVE') {
      return translate(language, 'panel.flow.baseError.notAnArchive')
    }
    const native = validationMessage(err)
    if (native) return native
    const server = rejectionDetail(err)
    if (server) return server
  }
  return translate(language, 'panel.flow.baseError.generic')
}
