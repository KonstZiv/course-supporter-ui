import type { CheckoutSource } from '../hooks/useCheckoutWatch'
import type { PurchaseApi } from '../components/billing/PackagesPurchase'
import { billingReason, portalApi, PortalApiError } from './api/portalClient'

// The student's side of the shared billing components: their checkouts and
// their purchase, through the portal's session client. Each call reads
// ``portalApi`` when it is made, so a test may replace one request alone.

export const PORTAL_CHECKOUTS: CheckoutSource = {
  getCheckout: (checkoutRef) => portalApi.billingCheckoutState(checkoutRef),
  reasonOf: billingReason,
}

export const PORTAL_PURCHASE: PurchaseApi = {
  getTerms: () => portalApi.billingTerms(),
  postConsent: (termsVersion, textSha256) =>
    portalApi.billingConsent(termsVersion, textSha256),
  postCheckout: (packageId) => portalApi.billingCheckout(packageId),
  reasonOf: billingReason,
  answered: (err) => err instanceof PortalApiError,
}
