// Student-facing "why" keyed by the backend's reason CODE — the third
// dictionary on this axis, and the home of the ratified wording (gates TASK §4).
//
// The three are distinct axes, not variants of one lookup:
//   terminalStatus.ts   — delivery STATUS (rejected / mismatch / failed) → phrase
//   submissionCodes.ts  — submit-time DOOR code, both vocabularies → phrase
//   this module         — the reason code the read-path now carries, on a whole
//                         submission (``rejection.code``) and on one file inside
//                         an archive (``not_opened[].reason``)
//
// Three layers answer a refused attempt, in this order (ratified):
//   1. the §4 article for the code, when there is one
//   2. the status phrase from terminalStatus.ts
//   3. that module's own generic default
// So ``rejectionPhrase`` returns null rather than a generic string when it has
// no article: ``mismatch`` and ``stage2_rejected`` deliberately have none, and
// their status phrases ("Надіслане не схоже на рішення цього завдання",
// "Рішення не пройшло перевірку безпеки") say more than any generic would.
//
// Every article is two parts: WHAT happened, always, and WHAT TO DO, only where
// the student actually has an action. The second half is never invented to fill
// the shape — a made-up instruction is worse than none.

import type { PortalNotOpened, PortalRejection } from './types'

export interface ReasonArticle {
  what: string
  action?: string
}

export function articlePhrase(a: ReasonArticle): string {
  return a.action ? `${a.what} ${a.action}` : a.what
}

// The last resort, once neither a code nor a status could say anything. Used by
// the door (submissionCodes.ts); the review detail falls to its status phrase
// first and only reaches a generic inside terminalStatus.
export const UNKNOWN_REASON: ReasonArticle = {
  what: 'Під час обробки подачі сталася помилка.',
  action: 'Спробуйте подати ще раз.',
}

// The structural guards share one answer: which of them tripped is a detail
// about the archive format, not about anything the student can act on
// differently. ``symlink_violation`` is grouped here rather than given its own
// article: nothing in the backend currently raises it (a symlink is refused as
// archive_violation), but keying it costs nothing and means the day it does
// start being raised the student gets this sentence instead of silently
// dropping to the status phrase.
const STRUCTURAL: ReasonArticle = {
  what: 'Архів не пройшов перевірку структури.',
  action:
    'Перепакуйте роботу звичайним архіватором без посилань і вкладених архівів.',
}

// One whole file was refused — the submission never became a review. Keyed by
// ErrorCategory value; the codes with no entry fall through to the status layer.
const WHOLE_FILE: Record<string, ReasonArticle> = {
  forbidden_type: {
    what: 'Цей формат файла не приймається.',
    action:
      'Надішліть роботу текстом (.md, .txt), документом (.docx, .pdf), ' +
      'кодом або архівом (.zip, .tar.gz).',
  },
  magic_mismatch: {
    what: 'Вміст файла не відповідає його розширенню.',
    action: 'Перевірте, що файл не пошкоджений і збережений у заявленому форматі.',
  },
  charset_violation: {
    what: 'Файл збережено не в кодуванні UTF-8.',
    action: 'Відкрийте його у редакторі та збережіть як UTF-8.',
  },
  size_limit: {
    what: 'Файл більший за дозволений розмір.',
    action: 'Приберіть із роботи зайве (великі дані, збірки) і подайте знову.',
  },
  over_budget: {
    what: 'Робота завелика для перевірки.',
    action: 'Лишіть у роботі лише потрібне і подайте знову.',
  },
  empty_document: {
    what: 'У поданому файлі немає тексту для перевірки.',
    action: 'Надішліть текстову версію роботи (не скан і не порожній архів).',
  },
  suspicious_unicode: {
    what: 'У тексті є приховані або підмінені символи.',
    action: 'Приберіть їх і подайте знову.',
  },
  prompt_injection: {
    what: 'Текст містить інструкції, адресовані системі перевірки.',
    action: 'Приберіть їх і подайте знову.',
  },
  archive_violation: STRUCTURAL,
  archive_bomb: STRUCTURAL,
  symlink_violation: STRUCTURAL,
}

// A gzipped single file is not a broken archive — it is the wrong shape, and
// the answer is different. The backend already separates the two: a valid gzip
// stream whose payload is not a tar yields magic_mismatch, while broken gzip
// framing yields archive_violation. So the extension is a sound discriminator
// here, not a guess: magic_mismatch on a .gz/.tgz IS the single-file case.
const BARE_GZIP: ReasonArticle = {
  what: 'Це не архів проєкту, а стиснений одиночний файл.',
  action: 'Запакуйте роботу як .zip або .tar.gz.',
}

export function reasonArticle(code: string): ReasonArticle | null {
  return WHOLE_FILE[code] ?? null
}

// The phrase for a refused attempt, or null when this dictionary has nothing to
// say and the caller should fall to the status layer.
export function rejectionPhrase(rejection: PortalRejection): string | null {
  const name = rejection.details ?? ''
  if (rejection.code === 'magic_mismatch' && /\.(gz|tgz)$/i.test(name)) {
    return articlePhrase(BARE_GZIP)
  }
  const article = reasonArticle(rejection.code)
  return article ? articlePhrase(article) : null
}

// --- One file inside an archive that was named but not read ---
//
// A different register from the whole-file articles: the submission itself was
// accepted, so these lines say what was skipped, not what to fix. Most carry no
// action — there is nothing to do about a .png in a code archive, and saying so
// would be noise on a review that otherwise went fine.

const IN_ARCHIVE: Record<string, ReasonArticle> = {
  charset_violation: { what: 'Файл не прочитано: кодування не UTF-8.' },
  nested_archive: { what: 'Файл не прочитано: архів усередині архіву.' },
  over_budget: { what: 'Файл не прочитано: завеликий для перевірки.' },
}

const DOCUMENT_IN_ARCHIVE: ReasonArticle = {
  what: 'Документи всередині архіву не читаються.',
  action: 'Надішліть його окремим файлом.',
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

export function notOpenedArticle(entry: PortalNotOpened): ReasonArticle {
  if (entry.reason === 'forbidden_type') {
    const name = basename(entry.path)
    // A document is the one skipped kind the student can do something about,
    // and the backend refuses it inside an archive on purpose (extracting per
    // member would multiply the attack surface for a case nobody submits).
    if (/\.(docx|pdf)$/i.test(name)) return DOCUMENT_IN_ARCHIVE
    // No dot at all in the NAME (not the path): Makefile, README. A dotfile
    // like .gitignore does have one and lands on the ordinary phrase, which is
    // the honest answer — its extension simply is not accepted.
    if (!name.includes('.')) return { what: 'Файл без розширення.' }
    return { what: 'Формат не підтримується.' }
  }
  // magic_mismatch inside an archive reuses the whole-file article: §4 marks
  // the encoding and budget rows as single-file-only but leaves this one
  // context-free, and it reads correctly either way.
  return (
    IN_ARCHIVE[entry.reason] ??
    reasonArticle(entry.reason) ?? { what: 'Файл не прочитано.' }
  )
}

export function notOpenedPhrase(entry: PortalNotOpened): string {
  return articlePhrase(notOpenedArticle(entry))
}

// Size as the student reads it, with the decimal comma Ukrainian uses. Shown
// because "not read" invites the question "how much did I lose" — a 40-byte
// .gitignore and a 4 MB dataset are very different answers.
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  const kb = bytes / 1024
  if (kb < 1024) return `${round(kb)} КБ`
  return `${round(kb / 1024)} МБ`
}

function round(n: number): string {
  return (n < 10 ? n.toFixed(1) : String(Math.round(n))).replace('.', ',')
}
