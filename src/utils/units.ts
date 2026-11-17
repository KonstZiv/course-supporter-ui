// Units, prices and dates as the author and the student read them, in
// Ukrainian. A pure module — no React — shared by the author app and the portal.
//
// Thousands are grouped with a no-break space (U+00A0), as on the platform
// site's pricing page ("1 500 юнітів"); it is set here rather than left to the
// browser's locale data, so every browser writes the same.

const GROUP_SEPARATOR = ' '

const INTEGER = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 })
const MINOR_UNITS = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const PLURAL = new Intl.PluralRules('uk-UA')

const UNIT_WORD: Record<Intl.LDMLPluralRule, string> = {
  zero: 'юнітів',
  one: 'юніт',
  two: 'юніти',
  few: 'юніти',
  many: 'юнітів',
  other: 'юніта',
}

function grouped(format: Intl.NumberFormat, n: number): string {
  return format
    .formatToParts(n)
    .map((part) => (part.type === 'group' ? GROUP_SEPARATOR : part.value))
    .join('')
}

/** A whole number with grouped thousands: 1500 → "1 500". */
export function formatNumber(n: number): string {
  return grouped(INTEGER, n)
}

/**
 * A change of a whole number, signed: 500 → "+500", −120 → "−120" (the minus
 * sign U+2212, not a hyphen), 0 → "0".
 */
export function formatSignedNumber(n: number): string {
  if (n > 0) return `+${formatNumber(n)}`
  if (n < 0) return `\u2212${formatNumber(-n)}`
  return formatNumber(0)
}

/** 1 → "1 юніт", 2 → "2 юніти", 5 → "5 юнітів", 1500 → "1 500 юнітів". */
export function formatUnits(n: number): string {
  return `${formatNumber(n)} ${UNIT_WORD[PLURAL.select(Math.abs(n))]}`
}

/** The forms of a Ukrainian noun after a number, by the plural category. */
export interface NounForms {
  one: string
  few: string
  many: string
  /** Fractions; whole numbers never take it. */
  other: string
}

/** The form of a noun that follows the number n: 1 → one, 2 → few, 5 → many. */
export function pluralWord(n: number, forms: NounForms): string {
  switch (PLURAL.select(Math.abs(n))) {
    case 'one':
      return forms.one
    case 'two':
    case 'few':
      return forms.few
    case 'other':
      return forms.other
    default:
      return forms.many
  }
}

function counted(n: number, forms: NounForms): string {
  return `${formatNumber(n)} ${pluralWord(n, forms)}`
}

/** 1 → "1 день", 2 → "2 дні", 5 → "5 днів", 21 → "21 день". */
export function formatDays(n: number): string {
  return counted(n, { one: 'день', few: 'дні', many: 'днів', other: 'дня' })
}

/** 1 → "1 робота", 2 → "2 роботи", 5 → "5 робіт", 21 → "21 робота". */
export function formatWorks(n: number): string {
  return counted(n, {
    one: 'робота',
    few: 'роботи',
    many: 'робіт',
    other: 'роботи',
  })
}

/** 1 → "1 перевірку", 2 → "2 перевірки", 5 → "5 перевірок", 21 → "21 перевірку". */
export function formatReviews(n: number): string {
  // The accusative after "на": "вистачить на 1 перевірку / 2 перевірки / 5 перевірок".
  return counted(n, {
    one: 'перевірку',
    few: 'перевірки',
    many: 'перевірок',
    other: 'перевірки',
  })
}

/** A package's name, as on the site's pricing page: "1 500 юнітів". */
export function formatPackageName(units: number): string {
  return formatUnits(units)
}

/** A price in euro cents: 999 → "9,99 EUR". */
export function formatPriceEur(minor: number): string {
  return `${grouped(MINOR_UNITS, minor / 100)} EUR`
}

const DATE_PARTS = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const DATE_PARTS_UTC = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * "15 листопада 2026" — without the "р." uk-UA adds after the year. A bare
 * day (YYYY-MM-DD) is that day wherever the reader is; a moment is the day
 * it falls on in the reader's time zone.
 */
export function formatDate(iso: string): string {
  const format = DATE_ONLY.test(iso) ? DATE_PARTS_UTC : DATE_PARTS
  const parts = format.formatToParts(new Date(iso))
  const v = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${v('day')} ${v('month')} ${v('year')}`
}
