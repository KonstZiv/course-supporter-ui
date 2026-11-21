// The R3 password-recovery self-service flow: its error phrases. The fixed UI
// copy (titles, labels, success/state phrases) is read by key where it is
// shown (`portal.recovery.*` in the catalog).
//
// The error map is keyed by a SEMANTIC error name, not an HTTP status — a
// screen maps its status → key itself (a 422 means "weak password" on reset but
// "invalid email" on the recovery-email section, so the HTTP code alone is
// ambiguous across the flow). Raw backend detail is never surfaced (it may be
// English; the phrases are the curated "why" in the reader's language).

import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'

// FE pre-validation mirror of the backend minimum (RP6 minimal mirror).
export const PASSWORD_MIN_LENGTH = 10

// --- keyed error phrases (semantic key → phrase, fallback accessor) ---
const FLOW_ERRORS: Record<string, MessageKey> = {
  rateLimited: 'portal.recovery.error.rateLimited',
  invalidToken: 'portal.recovery.error.invalidToken',
  invalidEmail: 'portal.recovery.error.invalidEmail',
  weakPassword: 'portal.recovery.reset.tooShort',
  missingToken: 'portal.recovery.error.missingToken',
  network: 'portal.recovery.error.network',
}

export function flowError(language: Language, key: string): string {
  return translate(language, FLOW_ERRORS[key] ?? 'portal.recovery.error.network', {
    min: PASSWORD_MIN_LENGTH,
  })
}
