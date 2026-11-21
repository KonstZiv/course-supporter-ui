import { PackagesPurchase } from '../../../components/billing/PackagesPurchase'
import { useLanguage } from '../../../i18n/LanguageContext'
import { consentLines } from '../../../utils/billingConsent'
import { PORTAL_PURCHASE } from '../../billingPorts'
import { actionFailureText, billingText } from '../../billingTexts'
import type { PortalBillingPackages } from '../../types'
import { PortalFailure, SupportMailText } from '../SupportMailText'

interface PortalPackagesSectionProps {
  packages: PortalBillingPackages
  /** The package list is out of date (a package left the sale): load it again. */
  onStale: () => void
}

/**
 * The packages on sale and the student's purchase: the shared section with
 * the portal's requests, the student's consent text and the support address.
 */
export function PortalPackagesSection({ packages, onStale }: PortalPackagesSectionProps) {
  const language = useLanguage()
  return (
    <PackagesPurchase
      packages={packages}
      onStale={onStale}
      api={PORTAL_PURCHASE}
      consentLines={consentLines(language, 'student')}
      failureWords={actionFailureText(language)}
      closedNote={
        <p className="text-ink">
          <SupportMailText text={billingText(language, 'portal.billing.purchaseNotOpen')} />
        </p>
      }
      renderFailure={(text) => <PortalFailure text={text} />}
    />
  )
}
