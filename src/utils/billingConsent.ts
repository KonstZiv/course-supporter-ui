// The billing terms consent the author gives before the first purchase (and
// again when the terms change). The window shows these lines, and the
// fingerprint sent with the consent is of the very same lines: one constant
// for both, so what is shown and what is recorded cannot drift apart.

export const CONSENT_LINES = [
  'Перед купівлею юнітів підтвердьте:',
  'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
  'Коротко: юніт — не гроші й не платіжний засіб, його не можна обміняти на гроші, продати чи передати; пакет діє шість місяців; за невикористані юніти чинного пакета ви можете отримати повернення оплати.',
  'Якщо умови зміняться, ми попросимо вас підтвердити їх знову.',
] as const

/** The lines joined by "\n", without a trailing newline: what is fingerprinted. */
export const CONSENT_TEXT = CONSENT_LINES.join('\n')

/** The words of the checkbox line that link to the site's pages. */
export const TERMS_LINK_WORDS = 'умови користування'
export const REFUNDS_LINK_WORDS = 'правила повернення оплати'

/** SHA-256 of `CONSENT_TEXT` in UTF-8, lowercase hex. */
export async function consentSha256(): Promise<string> {
  const bytes = new TextEncoder().encode(CONSENT_TEXT)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}
