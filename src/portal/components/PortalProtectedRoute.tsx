import { useEffect } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { usePortalSession } from '../stores/session'
import { isUuid } from '../uuid'
import { loginAddress } from '../signInReturn'
import { InvalidPortalLink } from './InvalidPortalLink'
import { syncServerLanguage } from '../stores/language'

// Guards portal routes that require an authenticated session (ratify Q3 + Q5).
//
//   - URL tenant segment not a UUID            → invalid-link page (no fetch).
//   - No session                               → redirect to this tenant's login.
//   - Session belongs to a DIFFERENT tenant    → clear() + redirect to login.
//
// The login carries the address being opened (``next``, ``signInReturn``), so
// sign-in brings the student back to it.
//
// The tenant-match check is a defence-in-depth UX guard only: the backend
// authorises EVERY API call by the bearer's ``tid`` claim and ignores the URL
// (ratify Q3 invariant). The URL tenant is routing / bootstrap, never the
// source of authorisation.
export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { tenantId } = useParams()
  const { pathname, search } = useLocation()
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

  // The language kept in the student's account, read once per session — for
  // a session the portal opened with (a sign-in answers it by itself).
  const validTenant = isUuid(tenantId)
  useEffect(() => {
    if (validTenant && token !== null && !tenantMismatch) syncServerLanguage(token)
  }, [validTenant, token, tenantMismatch])

  if (!isUuid(tenantId)) {
    return <InvalidPortalLink />
  }

  if (!token || tenantMismatch) {
    return <Navigate to={loginAddress(tenantId, pathname + search)} replace />
  }

  return <>{children}</>
}
