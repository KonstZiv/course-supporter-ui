import type { Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import type { ActionFailure } from '../utils/billingWords'
import { SUPPORT_ADDRESS } from '../utils/supportAddress'

// What the portal's "Юніти" page says where the author's says something else.
// The portal has no letter to the administrator (the author's ContactAdmin
// writes on the author's behalf): wherever the student should write, the
// sentence names the support address, which the page shows as a mailto link
// (`SupportMailText`). The rest — statement lines, packages, the payment's
// states — are the shared words of `utils/billingWords` and the shared
// billing components.

/** A sentence of the portal's "Юніти" page, with the support address put in. */
export function billingText(language: Language, key: MessageKey): string {
  return translate(language, key, { address: SUPPORT_ADDRESS })
}

/** The student's words for each failure of an action. */
const ACTION_FAILURE_KEY: Record<ActionFailure, MessageKey> = {
  package_not_found: 'shared.billing.packageNotFound',
  provider_unavailable: 'portal.billing.providerUnavailable',
  refused: 'portal.billing.actionFailed',
  unreachable: 'shared.billing.networkFailed',
}

export function actionFailureText(language: Language): Record<ActionFailure, string> {
  return {
    package_not_found: billingText(language, ACTION_FAILURE_KEY.package_not_found),
    provider_unavailable: billingText(language, ACTION_FAILURE_KEY.provider_unavailable),
    refused: billingText(language, ACTION_FAILURE_KEY.refused),
    unreachable: billingText(language, ACTION_FAILURE_KEY.unreachable),
  }
}
