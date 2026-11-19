import type {
  BillingExpiringSoon,
  BillingHeldReviews,
  BillingOutlookResponse,
} from '../types/api'
import { translate } from '../i18n/translate'
import type { ActionFailure } from './billingWords'
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
  return `За вашого темпу юнітів вистачить приблизно на ${formatDays('uk', outlook.days_left)}.`
}

export function expiringText(expiring: BillingExpiringSoon): string {
  return `${formatUnits('uk', expiring.units)} згорить ${formatDate('uk', expiring.expires_on)}: тоді закінчується строк пакета.`
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
        `Перевірки робіт ваших студентів чекають юнітів: ${formatWorks('uk', held.count)}. ` +
        `Щоб вони почалися, потрібно ще ${formatUnits('uk', held.missing_units)}.`,
      buy: true,
    }
  }
  return {
    text: `Юнітів уже вистачає: перевірки робіт ваших студентів (${formatWorks('uk', held.count)}) почнуться найближчим часом.`,
    buy: false,
  }
}

// ── A processing stopped for want of units (`error_category`) ──

export const INSUFFICIENT_UNITS_CATEGORY = 'insufficient_units'

// ── A failed load or action on the "Юніти" page ──
//
// The author's sentences send the author to the letter (ContactAdmin); the
// portal's name the support address instead (`portal/billingTexts`).

export const LOAD_FAILED =
  'Не вдалося завантажити дані про юніти. Оновіть сторінку; якщо повториться, напишіть нам.'
export const PROVIDER_UNAVAILABLE =
  'Сторінка оплати зараз не відкрилася. Спробуйте ще раз за хвилину; якщо повториться, напишіть нам.'
export const ACTION_FAILED =
  'Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, напишіть нам.'

/** The author's words for each failure of an action. */
export const ACTION_FAILURE_TEXT: Record<ActionFailure, string> = {
  package_not_found: translate('uk', 'shared.billing.packageNotFound'),
  provider_unavailable: PROVIDER_UNAVAILABLE,
  refused: ACTION_FAILED,
  unreachable: translate('uk', 'shared.billing.networkFailed'),
}
