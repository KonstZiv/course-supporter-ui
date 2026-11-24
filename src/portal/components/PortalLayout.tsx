import { Outlet } from 'react-router-dom'
import { SiteFooter } from '../../components/site/SiteFooter'
import { ServiceStatusBanner } from '../../components/ui/ServiceStatusBanner'
import { useServiceStatus } from '../../serviceStatus/store'

/**
 * The frame of every portal page: the page, then the site's footer with the
 * support address (payment provider's requirement: the address is visible on
 * every screen). One place, so a new page cannot lose the footer; pages fill
 * the height above it (`flex-1`) and never render a footer of their own.
 */
export function PortalLayout() {
  const status = useServiceStatus((s) => s.status)
  const hasSucceeded = useServiceStatus((s) => s.hasSucceeded)
  const recoveryCount = useServiceStatus((s) => s.recoveryCount)
  const blockInitialLoad = status !== 'ok' && !hasSucceeded

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {!blockInitialLoad && <ServiceStatusBanner />}
      <div className="flex-1 flex flex-col">
        {blockInitialLoad ? (
          <ServiceStatusBanner fullPage />
        ) : (
          <Outlet key={recoveryCount} />
        )}
      </div>
      <SiteFooter />
    </div>
  )
}
