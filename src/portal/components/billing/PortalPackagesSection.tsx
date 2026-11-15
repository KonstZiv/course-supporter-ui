import { PackagesPurchase } from '../../../components/billing/PackagesPurchase'
import { STUDENT_CONSENT_LINES } from '../../../utils/billingConsent'
import { PORTAL_PURCHASE } from '../../billingPorts'
import { ACTION_FAILURE_TEXT, PURCHASE_NOT_OPEN } from '../../billingTexts'
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
  return (
    <PackagesPurchase
      packages={packages}
      onStale={onStale}
      api={PORTAL_PURCHASE}
      consentLines={STUDENT_CONSENT_LINES}
      failureWords={ACTION_FAILURE_TEXT}
      closedNote={
        <p className="text-ink">
          <SupportMailText text={PURCHASE_NOT_OPEN} />
        </p>
      }
      renderFailure={(text) => <PortalFailure text={text} />}
    />
  )
}
