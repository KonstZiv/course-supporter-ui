// Author-facing phrases for what a code material's processing left out
// (step Г2 §2.6). Keyed by the bare ``CodeStructureReason`` token the server
// splits out of the stored ``token: detail`` string.
//
// A SEPARATE dictionary from ``ingestErrors.ts``, and deliberately so: that
// one is keyed by the security layer's ``ErrorCategory`` and answers "your
// upload was refused". This one answers "your material was processed, and
// these files were not part of it" — nothing failed, and a phrase that
// sounded like a failure would be wrong about eleven of the twelve rows.
// ``charset_violation`` appears in both vocabularies on purpose (the backend
// keeps one product word for one thing that happened to a file); the two
// phrases may read alike without the dictionaries being one.
//
// Form is "what happened", ratified 2026-09-04. No action per line — the
// block carries one action for all of them, because a per-row instruction
// would be invented noise under a `.DS_Store`.

import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import { formatBytes } from './formatBytes'

const REASON_KEYS: Record<string, MessageKey> = {
  denylist_dir: 'panel.codeStructure.denylistDir',
  denylist_file: 'panel.codeStructure.denylistFile',
  non_code_type: 'panel.codeStructure.nonCodeType',
  magic_mismatch: 'panel.codeStructure.magicMismatch',
  nested_archive: 'panel.codeStructure.nestedArchive',
  charset_violation: 'panel.codeStructure.charsetViolation',
  vendored_dir: 'panel.codeStructure.vendoredDir',
  lockfile: 'panel.codeStructure.lockfile',
  generated_artifact: 'panel.codeStructure.generatedArtifact',
  oversize: 'panel.codeStructure.oversize',
  build_config: 'panel.codeStructure.buildConfig',
  author_structure_only: 'panel.codeStructure.authorStructureOnly',
}

/**
 * "3 файли не прочитано" for the collapsed block heading.
 *
 * Counts BOTH groups: excluded files and description-only ones alike did not
 * reach the model by content, which is the one thing the heading has room to
 * say. The split into two reasons is what opening it is for.
 */
export function notReadCountLabel(language: Language, count: number): string {
  return translate(language, 'panel.codeStructure.notReadCount', { count })
}

/** One action for the whole block — never per row (ratified §4). */
export function structureBlockAction(language: Language): string {
  return translate(language, 'panel.codeStructure.blockAction')
}

/**
 * Phrase for a reason token, or a neutral line for one this build has not met.
 *
 * A token with no entry still names a file the author lost, so the fallback
 * says the reason is missing rather than dropping the row — the same rule the
 * student-side dictionary follows, for the same reason.
 */
export function structureReasonPhrase(
  language: Language,
  reason: string,
  detail?: string | null,
): string {
  if (reason === 'oversize') {
    const sizes = parseOversizeDetail(detail)
    if (sizes !== null) {
      return translate(language, 'panel.codeStructure.oversizeDetail', {
        size: formatBytes(language, sizes.size),
        cap: formatBytes(language, sizes.cap),
      })
    }
  }
  const key = REASON_KEYS[reason] ?? 'panel.codeStructure.unknown'
  return translate(language, key)
}

/**
 * The two byte counts the server puts in an ``oversize`` detail, or null.
 *
 * Shape is ``"<actual>/<cap>"`` (PR-1 commit B), chosen so the numbers survive
 * translation where the English sentence they replaced did not. Null on
 * anything else — a row written before that change still carries the old
 * sentence, and the numberless phrase is the honest answer for it rather than
 * a number invented to fill the shape.
 */
function parseOversizeDetail(
  detail: string | null | undefined,
): { size: number; cap: number } | null {
  if (!detail) return null
  const m = /^(\d+)\/(\d+)$/.exec(detail.trim())
  if (m === null) return null
  return { size: Number(m[1]), cap: Number(m[2]) }
}

/**
 * Whether the server's ``detail`` may be shown next to the phrase.
 *
 * Eleven of the twelve carry something the author recognises — the directory,
 * the filename, the pattern (``node_modules``, ``package-lock.json``,
 * ``*.min.js``). ``oversize`` is still suppressed, but for the opposite reason
 * to before: its detail is no longer an English sentence to hide (PR-1 commit
 * B replaced that with ``"<actual>/<cap>"``) — it is now READ, and both
 * numbers appear inside the phrase. Printing ``6291456/4194304`` after them
 * would say the same thing twice, once in bytes.
 */
export function detailIsShowable(reason: string): boolean {
  return reason !== 'oversize'
}
