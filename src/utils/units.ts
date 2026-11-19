// Units, prices and dates as the author and the student read them. A pure
// module — no React — shared by the author app and the portal. The words are
// in the catalog (`shared.units.*`); the numbers are formatted in the
// language's locale.
//
// Thousands are grouped with a no-break space (U+00A0), as on the platform
// site's pricing page ("1 500 юнітів"); it is set here rather than left to the
// browser's locale data, so every browser writes the same.

import { localeOf, type Language } from '../i18n/languages'
import { translate } from '../i18n/translate'

const GROUP_SEPARATOR = '\u00a0'

/** One formatter per locale, made on first use. */
function perLocale<T>(make: (locale: string) => T): (language: Language) => T {
  const made = new Map<string, T>()
  return (language) => {
    const locale = localeOf(language)
    let value = made.get(locale)
    if (value === undefined) {
      value = make(locale)
      made.set(locale, value)
    }
    return value
  }
}

const INTEGER = perLocale(
  (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
)
const MINOR_UNITS = perLocale(
  (locale) =>
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
)
const PLURAL = new Intl.PluralRules('uk-UA')

function grouped(format: Intl.NumberFormat, n: number): string {
  return format
    .formatToParts(n)
    .map((part) => (part.type === 'group' ? GROUP_SEPARATOR : part.value))
    .join('')
}

/** A whole number with grouped thousands: 1500 → "1 500". */
export function formatNumber(language: Language, n: number): string {
  return grouped(INTEGER(language), n)
}

/**
 * A change of a whole number, signed: 500 → "+500", −120 → "−120" (the minus
 * sign U+2212, not a hyphen), 0 → "0".
 */
export function formatSignedNumber(language: Language, n: number): string {
  if (n > 0) return `+${formatNumber(language, n)}`
  if (n < 0) return `\u2212${formatNumber(language, -n)}`
  return formatNumber(language, 0)
}

/** 1 → "1 юніт", 2 → "2 юніти", 5 → "5 юнітів", 1500 → "1 500 юнітів". */
export function formatUnits(language: Language, n: number): string {
  return translate(language, 'shared.units.units', {
    count: Math.abs(n),
    n: formatNumber(language, n),
  })
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

/** 1 → "1 день", 2 → "2 дні", 5 → "5 днів", 21 → "21 день". */
export function formatDays(language: Language, n: number): string {
  return translate(language, 'shared.units.days', {
    count: Math.abs(n),
    n: formatNumber(language, n),
  })
}

/** 1 → "1 робота", 2 → "2 роботи", 5 → "5 робіт", 21 → "21 робота". */
export function formatWorks(language: Language, n: number): string {
  return translate(language, 'shared.units.works', {
    count: Math.abs(n),
    n: formatNumber(language, n),
  })
}

/**
 * 1 → "1 перевірку", 2 → "2 перевірки", 5 → "5 перевірок", 21 → "21 перевірку":
 * the form that follows "вистачить на".
 */
export function formatReviews(language: Language, n: number): string {
  return translate(language, 'shared.units.reviews', {
    count: Math.abs(n),
    n: formatNumber(language, n),
  })
}

/** A package's name, as on the site's pricing page: "1 500 юнітів". */
export function formatPackageName(language: Language, units: number): string {
  return formatUnits(language, units)
}

/** A price in euro cents: 999 → "9,99 EUR". */
export function formatPriceEur(language: Language, minor: number): string {
  return `${grouped(MINOR_UNITS(language), minor / 100)} EUR`
}

const DATE_PARTS = perLocale(
  (locale) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
)
const DATE_PARTS_UTC = perLocale(
  (locale) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
)
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/**
 * "15 листопада 2026" — without the "р." uk-UA adds after the year. A bare
 * day (YYYY-MM-DD) is that day wherever the reader is; a moment is the day
 * it falls on in the reader's time zone.
 */
export function formatDate(language: Language, iso: string): string {
  const format = (DATE_ONLY.test(iso) ? DATE_PARTS_UTC : DATE_PARTS)(language)
  const parts = format.formatToParts(new Date(iso))
  const v = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${v('day')} ${v('month')} ${v('year')}`
}
