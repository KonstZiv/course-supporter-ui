// Code-keyed phrases for the submit-time door — BOTH vocabularies the doors
// speak. A refused upload comes back as ``{code, details}``, and the code
// arrives in one of two shapes depending on which gate refused it:
//
//   lower_snake (ErrorCategory)  forbidden_type / size_limit — the ordinary
//                                submission door (submission_core)
//   UPPER_SNAKE (project)        ARCHIVE_ONLY / BASE_NOT_READY /
//                                MISSING_BASE_ECHO / UNKNOWN_BASE_ECHO — the
//                                project preflight (KD18 P5)
//
// Both reach the same handler, so both resolve through this one lookup. The key
// spaces are disjoint by case, so the order of the two checks carries no
// meaning.
//
// A SEPARATE axis from terminalStatus.ts (which maps the delivery STATUS) and
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
// rejection stays on its status phrase in terminalStatus.ts — this dictionary
// is submit-time only.

import { articlePhrase, reasonArticle, UNKNOWN_REASON } from './rejectionReasons'

const SUBMISSION_CODES: Record<string, string> = {
  ARCHIVE_ONLY:
    'Це завдання очікує архів проєкту. Завантажте весь проєкт одним архівом ' +
    '(.zip, .tar.gz, .tgz або .gz) — окремий файл не приймається.',
  BASE_NOT_READY:
    'Базовий проєкт ще готується. Ваша подача звіряється з ним, тож зачекайте ' +
    'трохи й спробуйте подати ще раз.',
  MISSING_BASE_ECHO:
    'Не вдалося визначити версію базового проєкту для звірки. Оновіть сторінку ' +
    'й спробуйте подати ще раз.',
  UNKNOWN_BASE_ECHO:
    'Базовий проєкт оновився, відколи ви відкрили завдання. Подачу неможливо ' +
    'звірити зі старою версією. Оновіть сторінку, завантажте новий базовий ' +
    'проєкт і спробуйте ще раз.',
}

// Resolve a door code to a uk phrase. Total: an unknown code — a future backend
// code this interface has not learned — yields the ratified generic.
export function submissionCodePhrase(code: string): string {
  const project = SUBMISSION_CODES[code]
  if (project !== undefined) return project
  return articlePhrase(reasonArticle(code) ?? UNKNOWN_REASON)
}
