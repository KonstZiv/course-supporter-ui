import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { syncServerPanelLanguage } from './stores/panelLanguage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CoursePage } from './pages/CoursePage'
import { CourseProgressPage } from './pages/CourseProgressPage'
import { ConfirmRolesPage } from './pages/ConfirmRolesPage'
import { CostPage } from './pages/CostPage'
import { HomeworkCostPage } from './pages/HomeworkCostPage'
import { StudentsPage } from './pages/StudentsPage'
import { StudentSubmissionsPage } from './pages/StudentSubmissionsPage'
import { StudentSubmissionPage } from './pages/StudentSubmissionPage'
import { HistoryPage } from './pages/HistoryPage'
import { HelpPage } from './pages/HelpPage'
import { BillingPage } from './pages/BillingPage'
import { TestEditorPage } from './pages/TestEditorPage'
import { CriteriaEditorPage } from './pages/CriteriaEditorPage'
import { AppLayout } from './components/layout/AppLayout'
import { getLanguages } from './utils/languages'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const apiKey = useAuthStore((s) => s.apiKey)
  const location = useLocation()
  // Boot-time eager prefetch of the language whitelist (Task 2.4.13).
  // Fires once per authenticated session; cache warms before any
  // create-course modal mounts, so ``LanguageSelect`` renders the
  // full list without a network round-trip from a render path.
  useEffect(() => {
    if (apiKey) {
      void getLanguages().catch((err) => {
        console.error('Failed to prefetch language list', err)
      })
      syncServerPanelLanguage(apiKey)
    }
  }, [apiKey])
  // The sign-in page sends the author back here once the key is accepted.
  if (!apiKey) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  return <>{children}</>
}

// Leaving the program drops the key only once the move here has gone through,
// so a page that guards unsaved changes asks first (task 07c).
function Logout() {
  const logout = useAuthStore((s) => s.logout)
  useEffect(() => {
    logout()
  }, [logout])
  return <Navigate to="/login" replace />
}

// The payment provider sends the author back to the checkout's own address,
// {billing page}/checkouts/{checkout_ref} (backend `return_urls`); the billing
// page reads the number from its `checkout` parameter. The provider's own
// parameters are dropped on the way, and the move replaces the history entry.
function CheckoutReturn() {
  const { checkoutRef = '' } = useParams()
  return (
    <Navigate to={`/billing?checkout=${encodeURIComponent(checkoutRef)}`} replace />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/logout" element={<Logout />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="course/:nodeId" element={<CoursePage />} />
        <Route path="course/:courseId/progress" element={<CourseProgressPage />} />
        <Route
          path="document/:documentId/confirm-roles"
          element={<ConfirmRolesPage />}
        />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:studentId" element={<StudentSubmissionsPage />} />
        <Route
          path="students/:studentId/submissions/:submissionId"
          element={<StudentSubmissionPage />}
        />
        <Route path="cost" element={<CostPage />} />
        <Route path="cost/homework" element={<HomeworkCostPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="billing/checkouts/:checkoutRef" element={<CheckoutReturn />} />
        <Route path="history" element={<HistoryPage />} />
        {/* Both addresses render the same page, so a new test's first save
            moves it to its own address without a remount (task 07c). */}
        <Route path="test/new" element={<TestEditorPage />} />
        <Route path="test/:documentId/edit" element={<TestEditorPage />} />
        <Route path="task/:documentId/criteria" element={<CriteriaEditorPage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
