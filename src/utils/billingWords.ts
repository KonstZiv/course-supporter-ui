import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import type { BillingStatementItem } from '../types/api'

// What the "Юніти" pages of both apps say: a statement line's kind, and the
// failures of an action both say alike. A page picks a refusal's words by its
// reason code (`detail.code`); the server's English `details` never reach the
// screen.
//
// A pure module — no client, no store — shared by the author app and the
// portal. The sentences that name the way to write are each app's own: the
// author's in `authorBillingTexts`, the portal's in `portal/billingTexts`.

const KIND_TEXT: Record<string, MessageKey> = {
  purchase: 'shared.billing.kind.purchase',
  admin_credit: 'shared.billing.kind.adminCredit',
  benefit_covered: 'shared.billing.kind.benefitCovered',
  platform_covered: 'shared.billing.kind.platformCovered',
  expired: 'shared.billing.kind.expired',
  refund: 'shared.billing.kind.refund',
  refund_hold: 'shared.billing.kind.refundHold',
  refund_released: 'shared.billing.kind.refundReleased',
  dispute_hold: 'shared.billing.kind.disputeHold',
  dispute_released: 'shared.billing.kind.disputeReleased',
  dispute_lost: 'shared.billing.kind.disputeLost',
  difference_arisen: 'shared.billing.kind.differenceArisen',
  difference_repaid: 'shared.billing.kind.differenceRepaid',
  difference_annulled: 'shared.billing.kind.differenceAnnulled',
}

const CHARGE_TEXT: Record<string, MessageKey> = {
  processing: 'shared.billing.charge.processing',
  task_preparation: 'shared.billing.charge.taskPreparation',
  review: 'shared.billing.charge.review',
}

/** "Що відбулося" of a statement line; an unknown kind reads as a movement. */
export function statementLineText(
  language: Language,
  line: Pick<BillingStatementItem, 'kind' | 'action'>,
): string {
  const key =
    line.kind === 'charge'
      ? (line.action && CHARGE_TEXT[line.action.kind]) || 'shared.billing.charge.other'
      : (KIND_TEXT[line.kind] ?? 'shared.billing.kind.other')
  return translate(language, key)
}

/** Reason codes under which the purchase is not open for the account. */
export const PURCHASE_CLOSED_REASONS: readonly string[] = [
  'payment_unavailable',
  'purchase_not_open',
]

/**
 * What became of an action (consent, checkout) that failed with no state of
 * its own on the page: a package gone from the sale, a payment page that did
 * not open, another refusal, or no answer at all.
 */
export type ActionFailure =
  | 'package_not_found'
  | 'provider_unavailable'
  | 'refused'
  | 'unreachable'

/**
 * The failure of an action by its refusal's reason code (`reason`, null when
 * it carried none) and whether the server answered at all (`answered`): a
 * refusal without a known code is a refusal; no answer is the connection.
 */
export function actionFailure(
  reason: string | null,
  answered: boolean,
): ActionFailure {
  if (reason === 'package_not_found') return 'package_not_found'
  if (reason === 'provider_unavailable') return 'provider_unavailable'
  if (reason !== null || answered) return 'refused'
  return 'unreachable'
}
