// Code-keyed phrases for the submit-time door — BOTH vocabularies the doors
// speak. A refused upload comes back as ``{code, details}``, and the code
// arrives in one of two shapes depending on which gate refused it:
//
//   lower_snake (ErrorCategory)  forbidden_type / size_limit — the ordinary
//                                submission door (submission_core)
//   UPPER_SNAKE (project)        ARCHIVE_ONLY / BASE_NOT_READY /
//                                MISSING_BASE_ECHO / UNKNOWN_BASE_ECHO — the
//                                project preflight (KD18 P5)
//   UPPER_SNAKE (test)           TEST_ANSWERS_REQUIRED / TEST_FORM_UNAVAILABLE /
//                                NOT_A_TEST_TASK / TEST_VERSION_CHANGED /
//                                TEST_NOT_READY / ANSWERS_DO_NOT_MATCH_TEST —
//                                the doors of a test (task 07)
//   UPPER_SNAKE (comment)        STUDENT_NOTE_TOO_LONG / STUDENT_NOTE_REJECTED —
//                                the door of the student's comment (hotfix 6)
//
// Both reach the same handler, so both resolve through this one lookup. The key
// spaces are disjoint by case, so the order of the two checks carries no
// meaning.
//
// A SEPARATE axis from presentationPhrases.ts (which maps the SERVER'S answer
// about an attempt) and
// from rejectionReasons.ts (the reason code on a STORED attempt) — but the
// lower_snake half takes its wording from that module rather than restating it:
// the same refusal deserves the same sentence whether the student meets it at
// the door or reads it later on the attempt.
//
// Phrases are student-facing uk — the student never sees or types the snapshot
// hash, so the echo-mismatch codes are phrased as "the base changed, refresh"
// rather than "hash mismatch".
//
// An unknown code falls to the ratified generic and NEVER to the backend's own
// ``details``. That string is an English developer sentence ("File extension
// '.exe' is not accepted. Send the work as text, a document, code, or an
// archive."), and putting it in front of a student is exactly what DD-SP-D
// forbids. The dictionary is total by construction instead.
//
// The normalizer read-path rejection (DD-6-Z) is intentionally NOT here: the
// curated detail does not carry the normalizer source/reason, so a normalizer
// rejection stays on the phrase for its state in presentationPhrases.ts — this
// dictionary
// is submit-time only.

import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import { doorRefusal, PortalApiError } from './api/portalClient'
import { articlePhrase, reasonArticle, UNKNOWN_REASON } from './rejectionReasons'
import { formatCount, STUDENT_NOTE_MAX_CHARS } from './studentNote'

const SUBMISSION_CODES: Record<string, MessageKey> = {
  ARCHIVE_ONLY: 'portal.door.archiveOnly',
  BASE_NOT_READY: 'portal.door.baseNotReady',
  MISSING_BASE_ECHO: 'portal.door.missingBaseEcho',
  UNKNOWN_BASE_ECHO: 'portal.door.unknownBaseEcho',
  // Task 07 — the doors of a test. Worded for the student from the error index
  // of the documentation site (``/uk/errors/``): what happened, and what the
  // student can do about it. The server's ``details`` never reaches the screen.
  TEST_ANSWERS_REQUIRED: 'portal.door.testAnswersRequired',
  TEST_FORM_UNAVAILABLE: 'portal.door.testFormUnavailable',
  NOT_A_TEST_TASK: 'portal.door.notATestTask',
  TEST_VERSION_CHANGED: 'portal.door.testVersionChanged',
  TEST_NOT_READY: 'portal.door.testNotReady',
  ANSWERS_DO_NOT_MATCH_TEST: 'portal.door.answersDoNotMatchTest',
  // Hotfix 6 — the student's comment, refused before anything is stored. The
  // screens are the ones a text file meets, so the words follow the file's
  // (``suspicious_unicode`` and ``prompt_injection`` in rejectionReasons.ts);
  // the category the server names in ``details`` is not read here.
  STUDENT_NOTE_TOO_LONG: 'portal.door.studentNoteTooLong',
  STUDENT_NOTE_REJECTED: 'portal.door.studentNoteRejected',
  // Task 05 — the one refusal an answer about a review can meet. Not a door
  // code: the student reaches it from the review panel, not from the submit
  // form. It lives here because this is where a code becomes a sentence, and a
  // second module doing the same thing is a second place to keep in step.
  no_review: 'portal.door.noReview',
}

// Resolve a door code to a uk phrase. Total: an unknown code — a future backend
// code this interface has not learned — yields the ratified generic.
export function submissionCodePhrase(language: Language, code: string): string {
  const project = SUBMISSION_CODES[code]
  if (project !== undefined) {
    return translate(language, project, { max: formatCount(STUDENT_NOTE_MAX_CHARS) })
  }
  return articlePhrase(language, reasonArticle(code) ?? UNKNOWN_REASON)
}

// Curated phrase per HTTP status, for a refusal that carried no code. These
// replace the backend's own ``detail`` string, which for these statuses is an
// English developer sentence — "Task is not ready for submissions yet (its
// summary has not been generated)." — and showing it is the same DD-SP-D
// mistake as showing ``details`` was, only through a different branch.
//
// 401 is unreachable today: the catch in the submit handler returns on it
// before this function is called, because the client already cleared the
// session and redirected. It is kept for the reason an unreachable dictionary
// key is kept — the day that centralised handling moves, the student gets a
// sentence rather than the generic.
const STATUS_PHRASES: Record<number, MessageKey> = {
  401: 'portal.door.status.sessionEnded',
  404: 'portal.door.status.taskNotFound',
  409: 'portal.door.status.taskNotReady',
}

// Map a submit failure to a uk message. FastAPI nests an HTTPException's detail
// under the ``detail`` key, so a structured door refusal arrives as
// ``body.detail = {code, details}`` (an OBJECT) — the code is body.detail.code,
// NOT body.code. Order:
//   • detail is an object with a string ``code`` → the code-keyed phrase, in
//     either door vocabulary
//   • no code → the curated phrase for the status
//   • an unmapped status → the ratified generic
//   • not an API error at all (network, parse) → the connection phrase, which
//     is the one thing that IS specific about it
//
// The backend's own strings are read at NO point on any of these paths. A 422
// with no code no longer gets a format lecture either: every door refusal now
// carries a code, so a code-less 422 is a validation failure the student did
// not cause and cannot fix by changing their file.
// Statuses an ANSWER about a review can meet, as distinct from a submission's.
// A 409 never lands here: that refusal carries the ``no_review`` code and is
// answered by the dictionary above.
const TOUCH_STATUS_PHRASES: Record<number, MessageKey> = {
  401: 'portal.door.status.sessionEnded',
  404: 'portal.door.status.workGone',
}

// Map a failed answer about a review to a uk message. Same order as
// ``submitErrorMessage`` and the same rule: the backend's own English strings
// are read at no point.
export function touchErrorMessage(language: Language, err: unknown): string {
  const refusal = doorRefusal(err)
  if (refusal !== null) return submissionCodePhrase(language, refusal.code)
  if (err instanceof PortalApiError) {
    return translate(language, TOUCH_STATUS_PHRASES[err.status] ?? 'portal.door.touchFailed')
  }
  return translate(language, 'portal.door.touchNetwork')
}

export function submitErrorMessage(language: Language, err: unknown): string {
  const refusal = doorRefusal(err)
  if (refusal !== null) return submissionCodePhrase(language, refusal.code)
  if (err instanceof PortalApiError) {
    const phrase = STATUS_PHRASES[err.status]
    return phrase ? translate(language, phrase) : articlePhrase(language, UNKNOWN_REASON)
  }
  return translate(language, 'portal.door.submitNetwork')
}
