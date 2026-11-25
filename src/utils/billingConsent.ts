// The billing terms consent given before the first purchase (and again when
// the terms change). The window shows these lines, and the fingerprint sent
// with the consent is of the very same lines: one constant for both, so what
// is shown and what is recorded cannot drift apart. The author (program) and
// the student (portal) each have their own text; both are four lines, the
// first the window's title, the second the checkbox's. Joining a course by its
// link (open courses, portal) has a text of its own, four lines too: its own
// title and checkbox, then the student's summary and change lines word for
// word. The "18 or older" mark shown beside it is not part of it.

import { DEFAULT_LANGUAGE, type Language } from '../i18n/languages'
import { translate } from '../i18n/translate'

export type ConsentLines = readonly [string, string, string, string]

/** Whose consent: the author's, in the author program, or the student's, in the portal. */
export type ConsentHolder = 'author' | 'student'

/** The holder's four lines in a language, exactly as the catalog has them. */
export function consentLines(language: Language, holder: ConsentHolder): ConsentLines {
  return [
    translate(
      language,
      holder === 'author' ? 'shared.consent.author.title' : 'shared.consent.student.title',
    ),
    translate(language, 'shared.consent.checkbox'),
    translate(language, 'shared.consent.summary'),
    translate(language, 'shared.consent.change'),
  ]
}

/** The consent given on joining a course by its link, in the portal. */
export function joinConsentLines(language: Language): ConsentLines {
  return [
    translate(language, 'shared.consent.join.title'),
    translate(language, 'shared.consent.join.checkbox'),
    translate(language, 'shared.consent.summary'),
    translate(language, 'shared.consent.change'),
  ]
}

/** The author's consent, in the author program. */
export const CONSENT_LINES = consentLines(DEFAULT_LANGUAGE, 'author')

/** The student's consent, in the portal, in the default language. */
export const STUDENT_CONSENT_LINES = consentLines(DEFAULT_LANGUAGE, 'student')

/** The lines joined by "\n", without a trailing newline: what is fingerprinted. */
export function consentText(lines: ConsentLines = CONSENT_LINES): string {
  return lines.join('\n')
}

/** The author's text, as fingerprinted. */
export const CONSENT_TEXT = consentText(CONSENT_LINES)

/**
 * SHA-256 of the consent text of `lines` in UTF-8, lowercase hex; without an
 * argument, of the author's text.
 */
export async function consentSha256(
  lines: ConsentLines = CONSENT_LINES,
): Promise<string> {
  const bytes = new TextEncoder().encode(consentText(lines))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}
