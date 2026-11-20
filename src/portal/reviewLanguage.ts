// The review language the field opens on (Г-1 §5, the product owner's
// decision): the language of the pages, when the list of review languages
// offers it; else the course's language. When the pages speak the course's
// language, that is the "course language" option itself. The student's last
// review language (`preferred_language`) no longer decides it.

import type { PortalLanguageEntry } from './types'

/** The field's value to open on: an ISO 639-3 code, or "" — "in the course language". */
export function defaultReviewLanguage(
  pageIso3: string,
  courseLanguage: string | null,
  languages: readonly PortalLanguageEntry[],
): string {
  if (pageIso3 === courseLanguage) return ''
  return languages.some((l) => l.code === pageIso3) ? pageIso3 : ''
}
