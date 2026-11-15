// The billing terms consent given before the first purchase (and again when
// the terms change). The window shows these lines, and the fingerprint sent
// with the consent is of the very same lines: one constant for both, so what
// is shown and what is recorded cannot drift apart. The author (program) and
// the student (portal) each have their own text; both are four lines, the
// first the window's title, the second the checkbox's.

export type ConsentLines = readonly [string, string, string, string]

/** The author's consent, in the author program. */
export const CONSENT_LINES = [
  'Перед купівлею юнітів підтвердьте:',
  'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
  'Коротко: юніт — не гроші й не платіжний засіб, його не можна обміняти на гроші, продати чи передати; пакет діє шість місяців; за невикористані юніти чинного пакета ви можете отримати повернення оплати.',
  'Якщо умови зміняться, ми попросимо вас підтвердити їх знову.',
] as const satisfies ConsentLines

/** The student's consent, in the portal. */
export const STUDENT_CONSENT_LINES = [
  'Перед першою купівлею підтвердьте:',
  'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
  'Коротко: юніт — не гроші й не платіжний засіб, його не можна обміняти на гроші, продати чи передати; пакет діє шість місяців; за невикористані юніти чинного пакета ви можете отримати повернення оплати.',
  'Якщо умови зміняться, ми попросимо вас підтвердити їх знову.',
] as const satisfies ConsentLines

/** The lines joined by "\n", without a trailing newline: what is fingerprinted. */
export function consentText(lines: ConsentLines = CONSENT_LINES): string {
  return lines.join('\n')
}

/** The author's text, as fingerprinted. */
export const CONSENT_TEXT = consentText(CONSENT_LINES)

/** The words of the checkbox line that link to the site's pages. */
export const TERMS_LINK_WORDS = 'умови користування'
export const REFUNDS_LINK_WORDS = 'правила повернення оплати'

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
