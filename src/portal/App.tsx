import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { PortalLoginPage } from './pages/PortalLoginPage'
import { PortalForgotPasswordPage } from './pages/PortalForgotPasswordPage'
import { PortalResetPasswordPage } from './pages/PortalResetPasswordPage'
import { PortalConfirmEmailPage } from './pages/PortalConfirmEmailPage'
import { PortalHomePage } from './pages/PortalHomePage'
import { PortalCoursePage } from './pages/PortalCoursePage'
import { PortalBillingPage } from './pages/PortalBillingPage'
import { PortalProtectedRoute } from './components/PortalProtectedRoute'
import { InvalidPortalLink } from './components/InvalidPortalLink'
import { PortalLayout } from './components/PortalLayout'

// Bare /<tenant-id> → the portal home (which guards to login if unauthenticated).
function TenantIndex() {
  const { tenantId } = useParams()
  return <Navigate to={`/${tenantId}/home`} replace />
}

// The payment provider brings the student back to
// /<tenant>/billing/checkouts/<ref> (backend `return_urls`), maybe with
// parameters of its own: the number moves to the units page's `checkout`
// parameter, the rest is dropped, and the entry is replaced.
function CheckoutReturn() {
  const { tenantId, checkoutRef = '' } = useParams()
  return (
    <Navigate
      to={`/${tenantId}/billing?checkout=${encodeURIComponent(checkoutRef)}`}
      replace
    />
  )
}

// Portal router (Phase 6 / T4b, c1). All routes carry the tenant-id segment
// (ratify Q3). A separate router from the author app — they never share an
// App or an entry point. Every route, the neutral page among them, renders
// inside PortalLayout — the one place of the site's footer.
export function PortalApp() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route path="/:tenantId/login" element={<PortalLoginPage />} />
        <Route
          path="/:tenantId/forgot-password"
          element={<PortalForgotPasswordPage />}
        />
        <Route
          path="/:tenantId/reset-password"
          element={<PortalResetPasswordPage />}
        />
        <Route
          path="/:tenantId/confirm-email"
          element={<PortalConfirmEmailPage />}
        />
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
        <Route
          path="/:tenantId/billing"
          element={
            <PortalProtectedRoute>
              <PortalBillingPage />
            </PortalProtectedRoute>
          }
        />
        <Route
          path="/:tenantId/billing/checkouts/:checkoutRef"
          element={
            <PortalProtectedRoute>
              <CheckoutReturn />
            </PortalProtectedRoute>
          }
        />
        <Route path="/:tenantId" element={<TenantIndex />} />
        <Route path="*" element={<InvalidPortalLink />} />
      </Route>
    </Routes>
  )
}
