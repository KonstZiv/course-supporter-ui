// Student-facing "why" keyed by the backend's reason CODE — the third
// dictionary on this axis, and the home of the ratified wording (gates TASK §4).
//
// The axes are distinct, not variants of one lookup:
//   presentationPhrases.ts — the server's own answer about an attempt (five
//                         states + a reason code) → label, tone, phrase
//   submissionCodes.ts  — submit-time DOOR code, both vocabularies → phrase
//   this module         — the reason code the read-path now carries, on a whole
//                         submission (``rejection.code``) and on one file inside
//                         an archive (``not_opened[].reason``)
//   encodingNames.ts    — display name for the encoding a file was recovered
//                         from (step Г2 §2.2). Not a reason at all: it names a
//                         fact about a file that WAS read, which is why it sits
//                         beside this module rather than inside it.
//
// Three layers answer a refused attempt, in this order (ratified):
//   1. the §4 article for the code, when there is one
//   2. the phrase for the state, from presentationPhrases.ts
//   3. that module's own generic default
// So ``rejectionPhrase`` returns null rather than a generic string when it has
// no article: ``mismatch`` and ``stage2_rejected`` deliberately have none, and
// the phrase for their state ("Надіслане не схоже на рішення цього завдання")
// says more than any generic would.
//
// Every article is two parts: WHAT happened, always, and WHAT TO DO, only where
// the student actually has an action. The second half is never invented to fill
// the shape — a made-up instruction is worse than none.

import { localeOf, type Language } from '../i18n/languages'
import { translate, type MessageKey, type MessageValues } from '../i18n/translate'
import type { PortalNotOpened, PortalRejection } from './types'

/** An article by its catalog keys, and the values its sentences take. */
export interface ReasonArticle {
  what: MessageKey
  action?: MessageKey
  values?: MessageValues
}

export function articlePhrase(language: Language, a: ReasonArticle): string {
  const what = translate(language, a.what, a.values)
  return a.action ? `${what} ${translate(language, a.action, a.values)}` : what
}

// The last resort, once neither a code nor a status could say anything. Used by
// the door (submissionCodes.ts); the review detail falls to its status phrase
// first and only reaches a generic inside presentationPhrases.
export const UNKNOWN_REASON: ReasonArticle = {
  what: 'portal.reason.unknown.what',
  action: 'portal.reason.unknown.action',
}

// The structural guards share one answer: which of them tripped is a detail
// about the archive format, not about anything the student can act on
// differently. ``symlink_violation`` is grouped here rather than given its own
// article: nothing in the backend currently raises it (a symlink is refused as
// archive_violation), but keying it costs nothing and means the day it does
// start being raised the student gets this sentence instead of silently
// dropping to the status phrase.
const STRUCTURAL: ReasonArticle = {
  what: 'portal.reason.structural.what',
  action: 'portal.reason.structural.action',
}

// One whole file was refused — the submission never became a review. Keyed by
// ErrorCategory value; the codes with no entry fall through to the status layer.
const WHOLE_FILE: Record<string, ReasonArticle> = {
  forbidden_type: {
    what: 'portal.reason.wholeFile.forbiddenType.what',
    action: 'portal.reason.wholeFile.forbiddenType.action',
  },
  magic_mismatch: {
    what: 'portal.reason.wholeFile.magicMismatch.what',
    action: 'portal.reason.wholeFile.magicMismatch.action',
  },
  charset_violation: {
    what: 'portal.reason.wholeFile.charsetViolation.what',
    action: 'portal.reason.wholeFile.charsetViolation.action',
  },
  size_limit: {
    what: 'portal.reason.wholeFile.sizeLimit.what',
    action: 'portal.reason.wholeFile.sizeLimit.action',
  },
  over_budget: {
    what: 'portal.reason.wholeFile.overBudget.what',
    action: 'portal.reason.wholeFile.overBudget.action',
  },
  empty_document: {
    what: 'portal.reason.wholeFile.emptyDocument.what',
    action: 'portal.reason.wholeFile.emptyDocument.action',
  },
  // A project with no new or changed text file against the starting project
  // (mentor-rebuild, project chain K6): refused before anything is paid for.
  // Wording ratified by the operator 2026-11-15.
  no_changes: {
    what: 'portal.reason.wholeFile.noChanges.what',
    action: 'portal.reason.wholeFile.noChanges.action',
  },
  // A project whose new or changed files the doors could read none of —
  // mentor-rebuild, project chain K6 fix, #677; refused before anything is paid
  // for; its files come in not_opened below the phrase; wording ratified by the
  // operator 2026-11-16.
  no_readable_changes: {
    what: 'portal.reason.wholeFile.noReadableChanges.what',
    action: 'portal.reason.wholeFile.noReadableChanges.action',
  },
  suspicious_unicode: {
    what: 'portal.reason.wholeFile.suspiciousUnicode.what',
    action: 'portal.reason.wholeFile.suspiciousUnicode.action',
  },
  prompt_injection: {
    what: 'portal.reason.wholeFile.promptInjection.what',
    action: 'portal.reason.wholeFile.promptInjection.action',
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
  what: 'portal.reason.bareGzip.what',
  action: 'portal.reason.bareGzip.action',
}

// ``over_budget`` arrives from two places and means two different sizes. Stage 1
// refuses a single file or archive whose text does not fit the reading budget,
// and its ``details`` is the filename. The project branch refuses an assembled
// context no first rung of the mentor chain could hold (step E), and its
// ``details`` is the pair of numbers the refusal is about — numbers only, by
// design, because the sentence around them belongs here, in the language the
// student reads.
//
// The pair is parsed strictly: digits, a slash, digits. A filename never
// matches, so the stage-1 case falls through to the plain article untouched —
// which is the right answer there, since "приберіть з архіву" is nonsense
// advice for a single oversize .md.
const OVER_BUDGET_PAIR = /^\s*([\d\s\u00A0]+)\/([\d\s\u00A0]+)$/

function overBudgetWithNumbers(details: string): ReasonArticle | null {
  const m = OVER_BUDGET_PAIR.exec(details)
  if (!m) return null
  const digits = (raw: string | undefined) =>
    Number((raw ?? '').replace(/[\s\u00A0]/g, ''))
  const chars = digits(m[1])
  const budget = digits(m[2])
  // Both sides must be real counts: the character classes above also match a
  // run of spaces, and Number('') is a finite 0.
  if (!(chars > 0) || !(budget > 0)) return null
  // Numbers in a message are formatted in its language's locale, as
  // ``toLocaleString`` would.
  return {
    what: 'portal.reason.overBudgetPair.what',
    action: 'portal.reason.overBudgetPair.action',
    values: { chars, budget },
  }
}

// Two codes the rebuilt Mentor's path added (task 03). They are not about the
// FILE — nothing was wrong with what the student sent — so they live beside the
// whole-file articles rather than inside them, and each still answers the two
// questions every refusal owes: what happened, and what this person can do.
const PATH_STATE: Record<string, ReasonArticle> = {
  // The model safety check refused it. This wording is the one ratified in the
  // doors pass — it used to live in the status layer, which is why this code
  // deliberately had no article of its own. With that layer gone (task 03) the
  // sentence moves here rather than disappearing.
  stage2_rejected: {
    what: 'portal.reason.pathState.stage2Rejected.what',
  },
  // The run broke. Before this the student saw nothing but "Помилка".
  processing_failed: {
    what: 'portal.reason.pathState.processingFailed.what',
    action: 'portal.reason.pathState.processingFailed.action',
  },
  // Held before anything was spent, for want of units. The server says whose
  // units it waits for (BIL-E2, 5a): the code was split in two once the
  // payer became known to it, so each sentence names the right person.
  //
  // The student's own: they can act — buy units — and the review then goes on
  // by itself. The one thing either way: do not send the work again. A held
  // revision is already queued, and a second one would be a second submission
  // of the same work — paid for twice, judged twice, and racing the first
  // (``DD-SP-AT``).
  awaiting_funds: {
    what: 'portal.reason.pathState.awaitingFunds.what',
    action: 'portal.reason.pathState.awaitingFunds.action',
  },
  // The author's, who pays for this course's reviews: the work is taken, and
  // there is nothing for the student to do — no action, no numbers.
  awaiting_author_funds: {
    what: 'portal.reason.pathState.awaitingAuthorFunds.what',
  },
}

export function reasonArticle(code: string): ReasonArticle | null {
  return WHOLE_FILE[code] ?? PATH_STATE[code] ?? null
}

// The phrase for a refused attempt, or null when this dictionary has nothing to
// say and the caller should fall to the status layer.
export function rejectionPhrase(
  language: Language,
  rejection: PortalRejection,
): string | null {
  const name = rejection.details ?? ''
  if (rejection.code === 'magic_mismatch' && /\.(gz|tgz)$/i.test(name)) {
    return articlePhrase(language, BARE_GZIP)
  }
  if (rejection.code === 'over_budget') {
    const withNumbers = overBudgetWithNumbers(name)
    if (withNumbers) return articlePhrase(language, withNumbers)
  }
  const article = reasonArticle(rejection.code)
  return article ? articlePhrase(language, article) : null
}

// --- One file inside an archive that was named but not read ---
//
// A different register from the whole-file articles: the submission itself was
// accepted, so these lines say what was skipped, not what to fix. Most carry no
// action — there is nothing to do about a .png in a code archive, and saying so
// would be noise on a review that otherwise went fine.
//
// None of these repeats "not read". The block heading above them already says
// it ("Не прочитано під час перевірки", PortalReviewDetail), and three of the
// six lines used to carry it while the other three did not — an asymmetry that
// came from the two branches below being written apart rather than from any
// decision. Each line now says only the part the heading cannot: why.

const IN_ARCHIVE: Record<string, ReasonArticle> = {
  charset_violation: { what: 'portal.reason.inArchive.charsetViolation.what' },
  nested_archive: { what: 'portal.reason.inArchive.nestedArchive.what' },
  over_budget: { what: 'portal.reason.inArchive.overBudget.what' },
  may_contain_secrets: {
    what: 'portal.reason.inArchive.mayContainSecrets.what',
    action: 'portal.reason.inArchive.mayContainSecrets.action',
  },
}

const DOCUMENT_IN_ARCHIVE: ReasonArticle = {
  what: 'portal.reason.documentInArchive.what',
  action: 'portal.reason.documentInArchive.action',
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
    if (!name.includes('.')) return { what: 'portal.reason.inArchive.noExtension.what' }
    return { what: 'portal.reason.inArchive.unsupportedFormat.what' }
  }
  // magic_mismatch inside an archive reuses the whole-file article: §4 marks
  // the encoding and budget rows as single-file-only but leaves this one
  // context-free, and it reads correctly either way.
  //
  // The last resort says the reason is missing rather than restating the
  // heading. A code this dictionary has never seen still names a file the
  // student lost, and "Причину не вказано" is the honest form of that — it
  // does not pretend to an explanation, and it does not go blank.
  return (
    IN_ARCHIVE[entry.reason] ??
    reasonArticle(entry.reason) ?? { what: 'portal.reason.inArchive.noReason.what' }
  )
}

export function notOpenedPhrase(language: Language, entry: PortalNotOpened): string {
  return articlePhrase(language, notOpenedArticle(entry))
}

// Size as the student reads it, with the decimal separator of their language
// (the comma, in Ukrainian). Shown because "not read" invites the question "how
// much did I lose" — a 40-byte .gitignore and a 4 MB dataset are very different
// answers.
export function formatFileSize(language: Language, bytes: number): string {
  if (bytes < 1024) return translate(language, 'portal.size.bytes', { n: String(bytes) })
  const kb = bytes / 1024
  if (kb < 1024) return translate(language, 'portal.size.kilobytes', { n: round(language, kb) })
  return translate(language, 'portal.size.megabytes', { n: round(language, kb / 1024) })
}

function decimalSeparator(language: Language): string {
  const parts = new Intl.NumberFormat(localeOf(language)).formatToParts(1.5)
  return parts.find((p) => p.type === 'decimal')?.value ?? '.'
}

function round(language: Language, n: number): string {
  return n < 10 ? n.toFixed(1).replace('.', decimalSeparator(language)) : String(Math.round(n))
}

// "3 файли не прочитано" for the attempts list. Ukrainian needs three forms and
// picking one would be visibly wrong two thirds of the time — the list is where
// a student first sees that something was skipped, so the sentence has to read
// like a sentence. The count is written as is, without grouping.
export function notOpenedCountLabel(language: Language, count: number): string {
  return translate(language, 'portal.reason.notOpenedCount', { count, n: String(count) })
}
