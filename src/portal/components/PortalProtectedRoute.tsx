import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { usePortalSession } from '../stores/session'
import { isUuid } from '../uuid'
import { InvalidPortalLink } from './InvalidPortalLink'

// Guards portal routes that require an authenticated session (ratify Q3 + Q5).
//
//   - URL tenant segment not a UUID            → invalid-link page (no fetch).
//   - No session                               → redirect to this tenant's login.
//   - Session belongs to a DIFFERENT tenant    → clear() + redirect to login.
//
// The tenant-match check is a defence-in-depth UX guard only: the backend
// authorises EVERY API call by the bearer's ``tid`` claim and ignores the URL
// (ratify Q3 invariant). The URL tenant is routing / bootstrap, never the
// source of authorisation.
export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { tenantId } = useParams()
  const token = usePortalSession((s) => s.token)
  const sessionTenant = usePortalSession((s) => s.tenantId)
  const clear = usePortalSession((s) => s.clear)

  const tenantMismatch =
    token !== null && sessionTenant !== null && sessionTenant !== tenantId

  // A token scoped to another tenant must not linger when the URL points
  // elsewhere — drop it so the login below starts clean.
  useEffect(() => {
    if (tenantMismatch) {
      clear()
    }
  }, [tenantMismatch, clear])

  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }

  if (!token || tenantMismatch) {
    return <Navigate to={`/${tenantId}/login`} replace />
  }

  return <>{children}</>
}
