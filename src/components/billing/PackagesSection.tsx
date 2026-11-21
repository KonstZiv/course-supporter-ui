import {
  billingReason,
  getTerms,
  postCheckout,
  postConsent,
} from '../../api/billing'
import { ApiError } from '../../api/client'
import type { BillingPackagesResponse } from '../../types/api'
import { CONSENT_LINES } from '../../utils/billingConsent'
import { actionFailureText } from '../../utils/authorBillingTexts'
import { ContactAdmin } from '../ui/ContactAdmin'
import { FailureWithLetter } from './FailureWithLetter'
import { PackagesPurchase, type PurchaseApi } from './PackagesPurchase'
import { useLanguage, useT } from '../../i18n/LanguageContext'

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
  const language = useLanguage()
  const t = useT()

  return (
    <PackagesPurchase
      packages={packages}
      onStale={onStale}
      api={AUTHOR_PURCHASE}
      consentLines={CONSENT_LINES}
      failureWords={actionFailureText(language)}
      closedNote={
        <>
          <p className="text-ink">{t('panel.billing.packagesClosedNote')}</p>
          <ContactAdmin fallback="always" />
        </>
      }
      renderFailure={(text) => <FailureWithLetter text={text} />}
    />
  )
}
