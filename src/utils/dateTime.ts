// Absolute moment in the author's language and locale — "8 серпня 2026, 14:30".
// Composed from parts, NOT the locale's default combined format: uk-UA would add
// "р." after the year and an "о" before the time, neither of which the product
// form carries. Long month, HH:MM, no seconds — the second is a machine artefact
// (ARC §7 Г3). Lives beside relativeTime so any surface that must speak an exact
// moment reads it here, not from an inline toLocaleString that would drift into a
// second form. Renders in the runtime time zone (the author's, in the browser).
const DATE_TIME_PARTS = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatDateTime(iso: string): string {
  const parts = DATE_TIME_PARTS.formatToParts(new Date(iso))
  const v = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${v('day')} ${v('month')} ${v('year')}, ${v('hour')}:${v('minute')}`
}
