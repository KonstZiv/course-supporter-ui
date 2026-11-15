import { PaymentResult } from '../../../components/billing/PaymentResult'
import { PORTAL_CHECKOUTS } from '../../billingPorts'
import { PAYMENT_NOT_ARRIVED } from '../../billingTexts'
import { SupportMailText } from '../SupportMailText'
import { ReturnToWork } from './ReturnToWork'

interface PortalCheckoutNoticeProps {
  checkoutRef: string
  /** Load the balance and the statement again; resolves to the units available now. */
  onCredited: () => Promise<number | null>
  /** Close the notice and drop the checkout from the address. */
  onDismiss: () => void
}

/**
 * The result of a payment the student came back from: the shared notice with
 * the portal's checkouts, the support address after ten minutes, and the way
 * back to the work once the units are credited.
 */
export function PortalCheckoutNotice(props: PortalCheckoutNoticeProps) {
  return (
    <PaymentResult
      {...props}
      source={PORTAL_CHECKOUTS}
      stoppedNote={
        <p>
          <SupportMailText text={PAYMENT_NOT_ARRIVED} />
        </p>
      }
      creditedAction={<ReturnToWork />}
    />
  )
}
