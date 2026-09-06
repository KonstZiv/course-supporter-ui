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

import { formatBytes } from './formatBytes'

/** Files whose contents never reached the model at all. */
const NOT_INCLUDED: Record<string, string> = {
  denylist_dir: 'Службова тека середовища або редактора.',
  denylist_file: 'Службовий файл системи або редактора.',
  non_code_type: 'Не є кодом — такий тип файлу в кодовому матеріалі не читається.',
  magic_mismatch: 'Вміст файлу не відповідає його розширенню.',
  nested_archive: 'Архів усередині архіву — не розпаковувався.',
  charset_violation: 'Кодування не розпізнано — текст прочитати не вдалося.',
}

/** Files the model was given by name and place, but not by content. */
const NAME_ONLY: Record<string, string> = {
  vendored_dir: 'Стороння бібліотека у складі проєкту.',
  lockfile: 'Список залежностей проєкту.',
  generated_artifact: 'Файл, згенерований збіркою.',
  // Numberless fallback only. The cap used to be written here as "4 МБ" — a
  // copy of a server constant with nothing holding the two together, and it
  // was already wrong by the time anyone read it. Since step Д the server
  // sends both numbers in the detail, so the phrase below is built from them
  // and this line is what remains when the detail is missing or malformed.
  oversize: 'Файл завеликий — для читання не взято.',
  build_config: 'Налаштування складання проєкту.',
  author_structure_only:
    'За вашим вибором на екрані підтвердження ролей: увійшла лише назва.',
}

const REASON_PHRASES: Record<string, string> = { ...NOT_INCLUDED, ...NAME_ONLY }

/**
 * "3 файли не прочитано" for the collapsed block heading.
 *
 * Counts BOTH groups: excluded files and description-only ones alike did not
 * reach the model by content, which is the one thing the heading has room to
 * say. The split into two reasons is what opening it is for.
 *
 * A twin of the portal's ``notOpenedCountLabel`` — same three Ukrainian forms,
 * same rule — because the two bundles import nothing from each other (checked
 * both directions). Picking one form would be visibly wrong two thirds of the
 * time, and this is the line the author reads before deciding to open anything.
 */
export function notReadCountLabel(count: number): string {
  const last = count % 10
  const teens = count % 100
  const noun =
    last === 1 && teens !== 11
      ? 'файл'
      : last >= 2 && last <= 4 && (teens < 12 || teens > 14)
        ? 'файли'
        : 'файлів'
  return `${count} ${noun} не прочитано`
}

/** One action for the whole block — never per row (ratified §4). */
export const STRUCTURE_BLOCK_ACTION =
  'Матеріал оброблено без цих файлів; якщо вони потрібні — виправте і залийте знову.'

/**
 * Phrase for a reason token, or a neutral line for one this build has not met.
 *
 * A token with no entry still names a file the author lost, so the fallback
 * says the reason is missing rather than dropping the row — the same rule the
 * student-side dictionary follows, for the same reason.
 */
export function structureReasonPhrase(reason: string, detail?: string | null): string {
  if (reason === 'oversize') {
    const sizes = parseOversizeDetail(detail)
    if (sizes !== null) {
      return `Файл завеликий: ${formatBytes(sizes.size)} при межі ${formatBytes(sizes.cap)}.`
    }
  }
  return REASON_PHRASES[reason] ?? 'Причину не вказано.'
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
