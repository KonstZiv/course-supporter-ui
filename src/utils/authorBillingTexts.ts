import type {
  BillingExpiringSoon,
  BillingHeldReviews,
  BillingOutlookResponse,
} from '../types/api'
import { formatDate, formatDays, formatUnits, formatWorks } from './units'

// What the author app says about units outside the "Юніти" page's own
// sections: the reminders, the banner about students' reviews waiting for
// units, the price before a paid action and a processing stopped for want of
// units. A pure module: the words only, chosen by the server's codes.

export const BUY_UNITS = 'Купити юніти'

// ── Reminders (GET /billing/outlook) ──

/** "За вашого темпу…" — only with the warning and a number of days. */
export function runsOutText(outlook: BillingOutlookResponse): string | null {
  if (outlook.warning !== 'runs_out_soon' || outlook.days_left === null) {
    return null
  }
  return `За вашого темпу юнітів вистачить приблизно на ${formatDays(outlook.days_left)}.`
}

export function expiringText(expiring: BillingExpiringSoon): string {
  return `${formatUnits(expiring.units)} згорить ${formatDate(expiring.expires_on)}: тоді закінчується строк пакета.`
}

// ── Students' reviews waiting for the author's units ──

export interface HeldReviewsWords {
  text: string
  /** Units are still missing: the banner offers the purchase. */
  buy: boolean
}

export function heldReviewsWords(
  held: BillingHeldReviews,
): HeldReviewsWords | null {
  if (held.count <= 0) return null
  if (held.missing_units > 0) {
    return {
      text:
        `Перевірки робіт ваших студентів чекають юнітів: ${formatWorks(held.count)}. ` +
        `Щоб вони почалися, потрібно ще ${formatUnits(held.missing_units)}.`,
      buy: true,
    }
  }
  return {
    text: `Юнітів уже вистачає: перевірки робіт ваших студентів (${formatWorks(held.count)}) почнуться найближчим часом.`,
    buy: false,
  }
}

// ── A processing stopped for want of units (`error_category`) ──

export const INSUFFICIENT_UNITS_CATEGORY = 'insufficient_units'
