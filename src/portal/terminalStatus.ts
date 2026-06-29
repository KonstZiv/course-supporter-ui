// Submission lifecycle status → FE presentation (Phase 6 / T4b, c3b).
//
// This is the FE half of DD-6-D: the read-path serves the RAW lifecycle status
// (9 milestones); the backend deliberately does NOT carry a human-readable
// "why" field, and the internal trace (error_message / safety_result /
// sanity_result) is never on the contract. So the curated, generic,
// status-keyed phrases live HERE — shared (DRY) by the tree badge, the attempts
// list, and the review detail.
//
// Buckets mirror the backend overlay collapse (portal_courses._overlay_status):
//   reviewed = completed / delivered
//   error    = rejected / mismatch / failed   (a terminal error — review never
//              completed; DISTINCT from a reviewed verdict.passed === false,
//              which is "checked, not passed", not an error)
//   pending  = everything else (in-flight: received / safety_ok / sanity_ok /
//              reviewing), and any unknown value (fail-safe).

export type StatusBucket = 'pending' | 'reviewed' | 'error'

const REVIEWED_STATUSES = new Set(['completed', 'delivered'])
const ERROR_STATUSES = new Set(['rejected', 'mismatch', 'failed'])

export function statusBucket(status: string): StatusBucket {
  if (REVIEWED_STATUSES.has(status)) return 'reviewed'
  if (ERROR_STATUSES.has(status)) return 'error'
  return 'pending'
}

// Curated, student-facing "why" for the terminal-error statuses (NOT the
// backend error_message). The action hint is folded into the phrase; the
// re-submit affordance is the submission form already on the panel.
const ERROR_PHRASES: Record<string, string> = {
  rejected: 'Рішення не пройшло перевірку безпеки. Можна надіслати нову спробу.',
  mismatch:
    'Надіслане не схоже на рішення цього завдання. Перевірте, що подаєте ' +
    'правильний файл, і спробуйте ще раз.',
  failed: 'Не вдалося обробити подачу. Спробуйте надіслати ще раз.',
}

export function errorPhrase(status: string): string {
  return ERROR_PHRASES[status] ?? 'Під час обробки подачі сталася помилка.'
}

// Short label for the in-flight / pending bucket (single phrase regardless of
// the exact in-flight milestone).
export const PENDING_LABEL = 'На перевірці'
