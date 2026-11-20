import { billingReason, getCheckout } from '../../api/billing'
import type { CheckoutSource } from '../../hooks/useCheckoutWatch'
import { ContactAdmin } from '../ui/ContactAdmin'
import { PaymentResult } from './PaymentResult'
import { ReturnToWork } from './ReturnToWork'
import { useT } from '../../i18n/LanguageContext'

// The author's checkouts, asked with the author's key.
const AUTHOR_CHECKOUTS: CheckoutSource = {
  getCheckout,
  reasonOf: billingReason,
}

interface CheckoutNoticeProps {
  checkoutRef: string
  /**
   * The checkout is credited: load the balance and the statement again.
   * Resolves to the units available now, or null when the balance did not load.
   */
  onCredited: () => Promise<number | null>
  /** Close the notice and drop the checkout from the address. */
  onDismiss: () => void
}

/**
 * The result of a payment, over the balance, when the author comes back from
 * the payment page with the checkout's number in the address.
 */
export function CheckoutNotice({
  checkoutRef,
  onCredited,
  onDismiss,
}: CheckoutNoticeProps) {
  const t = useT()

  return (
    <PaymentResult
      checkoutRef={checkoutRef}
      source={AUTHOR_CHECKOUTS}
      onCredited={onCredited}
      onDismiss={onDismiss}
      creditedAction={<ReturnToWork />}
      stoppedNote={
        <>
          <p>
            {t('panel.billing.checkoutNotice.hourNote')}
          </p>
          <ContactAdmin fallback="always" />
        </>
      }
    />
  )
}
