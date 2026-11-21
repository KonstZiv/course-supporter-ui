import { Outlet } from 'react-router-dom'
import { SiteFooter } from '../../components/site/SiteFooter'

/**
 * The frame of every portal page: the page, then the site's footer with the
 * support address (payment provider's requirement: the address is visible on
 * every screen). One place, so a new page cannot lose the footer; pages fill
 * the height above it (`flex-1`) and never render a footer of their own.
 */
export function PortalLayout() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
      <SiteFooter />
    </div>
  )
}
