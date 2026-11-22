// What the portal says about units around a student's work (BIL-E, stage 2b):
// the price before a submission, the panel when units are short, the
// reminders of "Мої курси" and "Юніти", and the note of a review that cost
// more than its reserve. A pure module: the sentences with numbers in them,
// built from the catalog (`portal.units.*`); a sentence without numbers is
// read by its key where it is shown.

import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'
import { formatDate, formatReviews, formatUnits } from '../utils/units'

// ── Before a submission ───────────────────────────────────────────────

/** basis "ceiling", enough: the most the review can cost, then what is available. */
export function ceilingEnough(language: Language, price: number, available: number): string {
  return translate(language, 'portal.units.ceilingEnough', {
    price: formatUnits(language, price),
    available: formatUnits(language, available),
  })
}

/** basis "ceiling", not enough: the threshold is not the ceiling, so "ще". */
export function ceilingShort(
  language: Language,
  price: number,
  available: number,
  missing: number,
): string {
  return translate(language, 'portal.units.ceilingShort', {
    price: formatUnits(language, price),
    available: formatUnits(language, available),
    missing: formatUnits(language, missing),
  })
}

/** A price known (typical or for the file), enough. */
export function pricedEnough(language: Language, price: number, available: number): string {
  return translate(language, 'portal.units.pricedEnough', {
    price: formatUnits(language, price),
    available: formatUnits(language, available),
  })
}

/** A price known, not enough. */
export function pricedShort(
  language: Language,
  price: number,
  available: number,
  missing: number,
): string {
  return translate(language, 'portal.units.pricedShort', {
    price: formatUnits(language, price),
    available: formatUnits(language, available),
    missing: formatUnits(language, missing),
  })
}

// ── "Мої курси" and "Юніти" ───────────────────────────────────────────

/** "Юніти", under what is available. */
export function reviewsLeftLine(language: Language, reviewsLeft: number): string {
  return translate(language, 'portal.units.reviewsLeft', {
    reviews: formatReviews(language, reviewsLeft),
  })
}

/** "Мої курси", under the greeting. */
export function availableLine(
  language: Language,
  available: number,
  reviewsLeft: number | null,
): string {
  const units = formatUnits(language, available)
  return reviewsLeft === null || reviewsLeft === 0
    ? translate(language, 'portal.units.available', { units })
    : translate(language, 'portal.units.availableWithReviews', {
        units,
        reviews: formatReviews(language, reviewsLeft),
      })
}

export function lowReminder(language: Language, reviewsLeft: number): string {
  return translate(language, 'portal.units.lowReminder', {
    reviews: formatReviews(language, reviewsLeft),
  })
}

export function expiringReminder(language: Language, units: number, expiresOn: string): string {
  return translate(language, 'portal.units.expiringReminder', {
    units: formatUnits(language, units),
    date: formatDate(language, expiresOn),
  })
}

// ── A review that cost more than its reserve (6.3) ────────────────────

export function costOverReserve(
  language: Language,
  costUnits: number,
  chargedUnits: number,
): string {
  return translate(language, 'portal.units.costOverReserve', {
    cost: formatUnits(language, costUnits),
    charged: formatUnits(language, chargedUnits),
  })
}
