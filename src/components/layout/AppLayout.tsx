import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { useActivityStrip } from '../../hooks/useActivityStrip'
import { useOutlookReader } from '../../hooks/useOutlookReader'
import { HeldReviewsBanner } from '../billing/HeldReviewsBanner'
import { ServiceStatusBanner } from '../ui/ServiceStatusBanner'
import { SiteFooter } from '../site/SiteFooter'
import { useServiceStatus } from '../../serviceStatus/store'

export function AppLayout() {
  // The activity-strip poll lives here — above the route outlet — so it survives
  // child-route changes (В3). The last successful list feeds the header's
  // collapsed floor (and, when opened, the detailed panel).
  const { items } = useActivityStrip()
  // The outlook is asked here too, once per page: the banner below and the
  // reminders of the pages read the same answer.
  useOutlookReader()
  const status = useServiceStatus((s) => s.status)
  const hasSucceeded = useServiceStatus((s) => s.hasSucceeded)
  const recoveryCount = useServiceStatus((s) => s.recoveryCount)
  const blockInitialLoad = status !== 'ok' && !hasSucceeded

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <Header stripItems={items} />
      {!blockInitialLoad && <ServiceStatusBanner />}
      <HeldReviewsBanner />
      <main className="flex-1 w-full mx-auto flex flex-col">
        {blockInitialLoad ? (
          <ServiceStatusBanner fullPage />
        ) : (
          <Outlet key={recoveryCount} />
        )}
      </main>
      {/* The support address on every page after sign-in (payment provider's
          requirement). Pages of a screen's height, the course canvas among
          them, keep it: the footer comes after them, below the fold. */}
      <SiteFooter />
    </div>
  )
}
