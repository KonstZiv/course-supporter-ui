import { ApiError } from '../../api/client'
import { rejectionDetail, validationMessage } from '../../utils/apiError'

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
const BASE_ERROR_PHRASES: Record<string, string> = {
  BASE_VERSION_CONFLICT:
    'Інша версія base зараз завантажується. Зачекайте мить і спробуйте ще раз.',
  UPLOAD_TOO_LARGE: 'Архів завеликий — ліміт 100 МБ.',
  NOT_A_PROJECT_TASK: 'Base прикріплюється лише до завдання типу «Проєкт».',
  NOT_AN_ARCHIVE: 'Потрібен архів: .zip, .tar.gz, .tgz або .gz.',
}

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
export function baseErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const code = baseErrorCode(err)
    const phrase = code ? BASE_ERROR_PHRASES[code] : undefined
    if (phrase) return phrase
    const native = validationMessage(err)
    if (native) return native
    const server = rejectionDetail(err)
    if (server) return server
  }
  return 'Не вдалося прикріпити base. Перевірте зʼєднання та спробуйте ще раз.'
}
