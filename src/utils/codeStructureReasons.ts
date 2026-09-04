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
  oversize: 'Файл більший за 4 МБ — для читання завеликий.',
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
export function structureReasonPhrase(reason: string): string {
  return REASON_PHRASES[reason] ?? 'Причину не вказано.'
}

/**
 * Whether the server's ``detail`` may be shown next to the phrase.
 *
 * Eleven of the twelve carry something the author recognises — the directory,
 * the filename, the pattern (``node_modules``, ``package-lock.json``,
 * ``*.min.js``). ``oversize`` carries an internal English sentence with byte
 * counts in it (``file size 6291456 B exceeds the 4194304 B per-file cap``),
 * which is a developer string and must not reach the author; the size is
 * already in its phrase, so nothing is lost by suppressing it.
 *
 * Recorded for the server side rather than patched here: the detail itself
 * ought to be product-language or absent.
 */
export function detailIsShowable(reason: string): boolean {
  return reason !== 'oversize'
}
