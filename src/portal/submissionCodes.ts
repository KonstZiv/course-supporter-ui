// Code-keyed error phrases for the project-submission preflight (KD18 P5). A
// SEPARATE axis from terminalStatus.ts: that maps the read-path delivery STATUS
// (rejected / mismatch / failed) to a phrase; this maps the submit-time
// preflight CODE (from the {code, details} 422 / 409 body) to a phrase.
//
// Covers EXACTLY the four structural preflight codes the backend emits
// (submission_core.py project_preflight). Phrases are student-facing uk — the
// student never sees or types the snapshot hash, so the echo-mismatch codes are
// phrased as "the base changed, refresh" rather than "hash mismatch". An unknown
// code (e.g. a future backend code the FE has not learned) falls back to the
// backend's own ``details`` string via ``submissionCodePhrase``.
//
// The normalizer read-path rejection (DD-6-Z) is intentionally NOT here: the
// curated submission detail does not carry the normalizer source/reason, so a
// normalizer rejection stays the generic status='rejected' phrase in
// terminalStatus.ts — this dictionary is submit-time only.

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

// Resolve a submit-preflight code to a uk phrase. An unknown code falls back to
// the backend's own ``details`` string when available, else a generic message.
export function submissionCodePhrase(code: string, fallbackDetail?: string): string {
  return SUBMISSION_CODES[code] ?? fallbackDetail ?? 'Файл не прийнято.'
}
