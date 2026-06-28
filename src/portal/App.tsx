import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { PortalLoginPage } from './pages/PortalLoginPage'
import { PortalHomePage } from './pages/PortalHomePage'
import { PortalCoursePage } from './pages/PortalCoursePage'
import { PortalProtectedRoute } from './components/PortalProtectedRoute'
import { InvalidPortalLink } from './components/InvalidPortalLink'

// Bare /<tenant-id> → the portal home (which guards to login if unauthenticated).
function TenantIndex() {
  const { tenantId } = useParams()
  return <Navigate to={`/${tenantId}/home`} replace />
}

// Portal router (Phase 6 / T4b, c1). All routes carry the tenant-id segment
// (ratify Q3). A separate router from the author app — they never share an
// App or an entry point.
export function PortalApp() {
  return (
    <Routes>
      <Route path="/:tenantId/login" element={<PortalLoginPage />} />
      <Route
        path="/:tenantId/home"
        element={
          <PortalProtectedRoute>
            <PortalHomePage />
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/:tenantId/courses/:rootId"
        element={
          <PortalProtectedRoute>
            <PortalCoursePage />
          </PortalProtectedRoute>
        }
      />
      <Route path="/:tenantId" element={<TenantIndex />} />
      <Route path="*" element={<InvalidPortalLink />} />
    </Routes>
  )
}
