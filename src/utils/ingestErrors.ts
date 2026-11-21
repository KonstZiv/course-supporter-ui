// Author-facing ingestion / upload error dictionary (DD-SP-D, task-code-materials F4).
//
// ONE map keyed by the backend security ErrorCategory ``.value`` string, serving
// BOTH surfaces (DD-SP-D "one dictionary, two surfaces"):
//   * async failures on the DOCUMENT/JOB rows (error_category), shown in the
//     material card;
//   * synchronous upload rejections (HTTP 400 detail.category) at the upload
//     door (wired through apiError in the follow-up UI commit).
// Texts come from the product-language catalog; the course language is deliberately
// NOT used — this is author-facing chrome, not model content.
//
// Fallback rule (DD-SP-D): an unknown or absent category NO LONGER shows the
// raw backend text — it degrades to the generic pipeline_failure phrase, so a
// category the map does not yet cover is still a human sentence, never a raw
// string. This is the structural guard against the two stores drifting apart
// (a cross-store test is not technically possible).

import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'

const INGEST_ERROR_KEYS: Record<string, MessageKey> = {
  // ── async ingestion classes ──
  empty_document: 'panel.ingestErrors.emptyDocument',
  presentation_empty_segment: 'panel.ingestErrors.presentationEmptySegment',
  stage2_rejected: 'panel.ingestErrors.stage2Rejected',
  external_source_unavailable: 'panel.ingestErrors.externalSourceUnavailable',
  pipeline_failure: 'panel.ingestErrors.pipelineFailure',
  // ── synchronous upload-rejection classes (author sync door) ──
  suspicious_unicode: 'panel.ingestErrors.suspiciousUnicode',
  charset_violation: 'panel.ingestErrors.charsetViolation',
  size_limit: 'panel.ingestErrors.sizeLimit',
  forbidden_type: 'panel.ingestErrors.forbiddenType',
  prompt_injection: 'panel.ingestErrors.promptInjection',
  magic_mismatch: 'panel.ingestErrors.magicMismatch',
  // Archives / symbolic links — no technical detail for the author:
  archive_violation: 'panel.ingestErrors.archiveViolation',
  archive_bomb: 'panel.ingestErrors.archiveBomb',
  symlink_violation: 'panel.ingestErrors.symlinkViolation',
  slide_count_limit: 'panel.ingestErrors.slideCountLimit',
  // Not a fault of the material: the author's units did not cover its
  // processing (BIL-E). The material stays; the card offers the purchase.
  insufficient_units: 'panel.ingestErrors.insufficientUnits',
}

/**
 * Resolve the author-facing message for an ingestion / upload failure category.
 *
 * Category-first (stable code → stable text); an unknown or absent category
 * degrades to the generic pipeline_failure phrase — never a raw backend string
 * (DD-SP-D fallback rule).
 */
export function ingestErrorMessage(
  language: Language,
  errorCategory: string | null | undefined,
): string {
  const key =
    errorCategory && Object.prototype.hasOwnProperty.call(INGEST_ERROR_KEYS, errorCategory)
      ? (INGEST_ERROR_KEYS[errorCategory] as MessageKey)
      : 'panel.ingestErrors.pipelineFailure'
  return translate(language, key)
}
