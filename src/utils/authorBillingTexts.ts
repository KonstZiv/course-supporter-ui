import type {
  BillingExpiringSoon,
  BillingHeldReviews,
  BillingOutlookResponse,
} from '../types/api'
import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import type { ActionFailure } from './billingWords'
import { formatDate, formatDays, formatUnits, formatWorks } from './units'

// What the author app says about units outside the "Юніти" page's own
// sections: the reminders, the banner about students' reviews waiting for
// units, the price before a paid action and a processing stopped for want of
// units. A pure module: the words only, chosen by the server's codes.

export function buyUnitsText(language: Language): string {
  return translate(language, 'panel.billing.buyUnits')
}

// ── Reminders (GET /billing/outlook) ──

/** "За вашого темпу…" — only with the warning and a number of days. */
export function runsOutText(language: Language, outlook: BillingOutlookResponse): string | null {
  if (outlook.warning !== 'runs_out_soon' || outlook.days_left === null) {
    return null
  }
  return translate(language, 'panel.billing.runsOut', {
    days: formatDays(language, outlook.days_left),
  })
}

export function expiringText(language: Language, expiring: BillingExpiringSoon): string {
  return translate(language, 'panel.billing.expiring', {
    units: formatUnits(language, expiring.units),
    date: formatDate(language, expiring.expires_on),
  })
}

// ── Students' reviews waiting for the author's units ──

export interface HeldReviewsWords {
  text: string
  /** Units are still missing: the banner offers the purchase. */
  buy: boolean
}

export function heldReviewsWords(
  language: Language,
  held: BillingHeldReviews,
): HeldReviewsWords | null {
  if (held.count <= 0) return null
  if (held.missing_units > 0) {
    return {
      text: translate(language, 'panel.billing.heldReviews.waiting', {
        works: formatWorks(language, held.count),
        units: formatUnits(language, held.missing_units),
      }),
      buy: true,
    }
  }
  return {
    text: translate(language, 'panel.billing.heldReviews.enough', {
      works: formatWorks(language, held.count),
    }),
    buy: false,
  }
}

// ── A processing stopped for want of units (`error_category`) ──

export const INSUFFICIENT_UNITS_CATEGORY = 'insufficient_units'

// ── A failed load or action on the "Юніти" page ──
//
// The author's sentences send the author to the letter (ContactAdmin); the
// portal's name the support address instead (`portal/billingTexts`).

export function loadFailedText(language: Language): string {
  return translate(language, 'panel.billing.loadFailed')
}

export function providerUnavailableText(language: Language): string {
  return translate(language, 'panel.billing.providerUnavailable')
}

export function actionFailedText(language: Language): string {
  return translate(language, 'panel.billing.actionFailed')
}

const ACTION_FAILURE_KEY: Record<ActionFailure, MessageKey> = {
  package_not_found: 'shared.billing.packageNotFound',
  provider_unavailable: 'panel.billing.providerUnavailable',
  refused: 'panel.billing.actionFailed',
  unreachable: 'shared.billing.networkFailed',
}

/** The author's words for each failure of an action. */
export function actionFailureText(language: Language): Record<ActionFailure, string> {
  return {
    package_not_found: translate(language, ACTION_FAILURE_KEY.package_not_found),
    provider_unavailable: translate(language, ACTION_FAILURE_KEY.provider_unavailable),
    refused: translate(language, ACTION_FAILURE_KEY.refused),
    unreachable: translate(language, ACTION_FAILURE_KEY.unreachable),
  }
}
