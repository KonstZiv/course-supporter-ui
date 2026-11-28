// What the portal says about units around a student's work (BIL-E, stage 2b):
// the price before a submission, the panel when units are short, the
// reminders of "Мої курси" and "Юніти", and the note of a review that cost
// more than its reserve. A pure module: the sentences with numbers in them,
// built from the catalog (`portal.units.*`); a sentence without numbers is
// read by its key where it is shown.

import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'
import { formatDate, formatNumber, formatReviews, formatUnits } from '../utils/units'
import type { PortalPublicNumbers } from './types'

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

export interface ZeroUnitsNumbers {
  typical: number
  min: number
  max: number
  packageUnits: number
  low: number
  high: number
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

/**
 * Extract the numbers needed for the priced zero-units line from
 * `GET /api/v1/public/numbers`, or null when `homework.status !== 'ready'`
 * or any required number is missing.
 */
export function extractZeroUnitsNumbers(
  data: PortalPublicNumbers | null,
): ZeroUnitsNumbers | null {
  if (!data) return null
  const hw = data.review_cost?.homework
  if (hw?.status !== 'ready') return null
  const typical = hw.actual?.typical
  const min = hw.actual?.min
  const max = hw.actual?.max
  const low = hw.smallest_package_reviews?.low
  const high = hw.smallest_package_reviews?.high
  const packageUnits = (data.packages ?? []).reduce<number | null>(
    (smallest, pkg) =>
      isFiniteNumber(pkg.units)
        ? smallest === null
          ? pkg.units
          : Math.min(smallest, pkg.units)
        : smallest,
    null,
  )
  if (
    !isFiniteNumber(typical) ||
    !isFiniteNumber(min) ||
    !isFiniteNumber(max) ||
    !isFiniteNumber(packageUnits) ||
    !isFiniteNumber(low) ||
    !isFiniteNumber(high)
  ) {
    return null
  }
  return { typical, min, max, packageUnits, low, high }
}

/**
 * Reminder for a student with 0 available units: priced with typical review
 * cost and smallest package coverage when public numbers are ready, or the
 * plain fallback otherwise.
 */
export function zeroUnitsReminder(
  language: Language,
  data: PortalPublicNumbers | null,
): string {
  const numbers = extractZeroUnitsNumbers(data)
  if (!numbers) return translate(language, 'portal.units.zeroPlain')
  return translate(language, 'portal.units.zeroPriced', {
    typical: formatUnits(language, numbers.typical),
    min: formatNumber(language, numbers.min),
    max: formatNumber(language, numbers.max),
    package: formatUnits(language, numbers.packageUnits),
    low: formatNumber(language, numbers.low),
    high: numbers.high,
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
