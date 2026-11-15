import type { BillingStatementItem } from '../types/api'

// What the "Юніти" pages say: a statement line's kind, and a failed load or
// action. A page picks a refusal's words by its reason code (`detail.code`);
// the server's English `details` never reach the screen.
//
// A pure module — no client, no store — shared by the author app and the
// portal. The sentences below are the author's; the portal has its own
// (`portal/billingTexts.ts`), which name the support address instead.

const KIND_TEXT: Record<string, string> = {
  purchase: 'Купівля пакета',
  admin_credit: 'Нараховано адміністратором платформи',
  benefit_covered: 'Оплачено платформою за домовленістю',
  platform_covered: 'Решту вартості взяла на себе платформа',
  expired: 'Строк пакета минув',
  refund: 'Повернення оплати',
  refund_hold: 'Утримано на час повернення оплати',
  refund_released: 'Утримання на час повернення оплати знято',
  dispute_hold: 'Заблоковано до завершення спору щодо платежу',
  dispute_released: 'Знову доступні після спору щодо платежу',
  dispute_lost: 'Анульовано за підсумком спору щодо платежу',
  difference_arisen: 'Використано понад залишок',
  difference_repaid: 'Враховано використане понад залишок',
  difference_annulled: 'Використане понад залишок взяла на себе платформа',
}

const CHARGE_TEXT: Record<string, string> = {
  processing: 'Обробка матеріалів',
  task_preparation: 'Підготовка завдання до оцінювання',
  review: 'Перевірка роботи',
}

const CHARGE_FALLBACK = 'Списання за дію'
const KIND_FALLBACK = 'Інший рух юнітів'

/** "Що відбулося" of a statement line; an unknown kind reads as a movement. */
export function statementLineText(
  line: Pick<BillingStatementItem, 'kind' | 'action'>,
): string {
  if (line.kind === 'charge') {
    return (line.action && CHARGE_TEXT[line.action.kind]) || CHARGE_FALLBACK
  }
  return KIND_TEXT[line.kind] ?? KIND_FALLBACK
}

export const LOAD_FAILED =
  'Не вдалося завантажити дані про юніти. Оновіть сторінку; якщо повториться, напишіть нам.'
export const PACKAGE_NOT_FOUND =
  'Цей пакет зараз недоступний. Оберіть пакет ще раз.'
export const PROVIDER_UNAVAILABLE =
  'Сторінка оплати зараз не відкрилася. Спробуйте ще раз за хвилину; якщо повториться, напишіть нам.'
export const ACTION_FAILED =
  'Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, напишіть нам.'
export const NETWORK_FAILED =
  "Не вдалося з'єднатися з платформою. Перевірте з'єднання з інтернетом і спробуйте ще раз."

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

/** The author's words for each failure of an action. */
export const ACTION_FAILURE_TEXT: Record<ActionFailure, string> = {
  package_not_found: PACKAGE_NOT_FOUND,
  provider_unavailable: PROVIDER_UNAVAILABLE,
  refused: ACTION_FAILED,
  unreachable: NETWORK_FAILED,
}
