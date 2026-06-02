import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CoursePage } from './pages/CoursePage'
import { CostPage } from './pages/CostPage'
import { AppLayout } from './components/layout/AppLayout'
import { getLanguages } from './utils/languages'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const apiKey = useAuthStore((s) => s.apiKey)
  // Boot-time eager prefetch of the language whitelist (Task 2.4.13).
  // Fires once per authenticated session; cache warms before any
  // create-course modal mounts, so ``LanguageSelect`` renders the
  // full list without a network round-trip from a render path.
  useEffect(() => {
    if (apiKey) {
      void getLanguages().catch((err) => {
        console.error('Failed to prefetch language list', err)
      })
    }
  }, [apiKey])
  if (!apiKey) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="cost" element={<CostPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
