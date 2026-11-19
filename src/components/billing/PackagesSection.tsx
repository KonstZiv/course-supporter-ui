import {
  billingReason,
  getTerms,
  postCheckout,
  postConsent,
} from '../../api/billing'
import { ApiError } from '../../api/client'
import type { BillingPackagesResponse } from '../../types/api'
import { CONSENT_LINES } from '../../utils/billingConsent'
import { ACTION_FAILURE_TEXT } from '../../utils/authorBillingTexts'
import { ContactAdmin } from '../ui/ContactAdmin'
import { FailureWithLetter } from './FailureWithLetter'
import { PackagesPurchase, type PurchaseApi } from './PackagesPurchase'

export const PURCHASE_NOT_OPEN_TEXT =
  'Купівля юнітів у програмі ще не відкрита. Якщо юніти потрібні вам зараз, напишіть адміністраторові платформи.'

// The author's purchase, with the author's key.
const AUTHOR_PURCHASE: PurchaseApi = {
  getTerms,
  postConsent,
  postCheckout,
  reasonOf: billingReason,
  answered: (err) => err instanceof ApiError,
}

interface PackagesSectionProps {
  packages: BillingPackagesResponse
  /** The package list is out of date (a package left the sale): load it again. */
  onStale: () => void
}

/**
 * The packages on sale and the author's purchase: the terms, the one-time
 * consent, the checkout, then the payment page in the same tab.
 */
export function PackagesSection({ packages, onStale }: PackagesSectionProps) {
  return (
    <PackagesPurchase
      packages={packages}
      onStale={onStale}
      api={AUTHOR_PURCHASE}
      consentLines={CONSENT_LINES}
      failureWords={ACTION_FAILURE_TEXT}
      closedNote={
        <>
          <p className="text-ink">{PURCHASE_NOT_OPEN_TEXT}</p>
          <ContactAdmin fallback="always" />
        </>
      }
      renderFailure={(text) => <FailureWithLetter text={text} />}
    />
  )
}
