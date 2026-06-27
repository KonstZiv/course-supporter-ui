import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen, LogOut, ChevronRight, Loader2 } from 'lucide-react'
import { usePortalSession } from '../stores/session'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalCourseListItem } from '../types'

// Portal landing (Phase 6 / T4b, c2): the student's enrolled courses
// (GET /portal/courses). The greeting name comes from the session store
// (set at login) — no /me round-trip needed (ratify Q5). Click a course →
// its material tree.
export function PortalHomePage() {
  const { tenantId } = useParams()
  const displayName = usePortalSession((s) => s.displayName)
  const clear = usePortalSession((s) => s.clear)
  const navigate = useNavigate()

  const [courses, setCourses] = useState<PortalCourseListItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    portalApi
      .courses()
      .then(setCourses)
      .catch((err) => {
        // 401 is handled inside the client (clear + redirect); anything else
        // is a soft error on this page.
        if (!(err instanceof PortalApiError && err.status === 401)) {
          setError('Не вдалося завантажити курси.')
        }
      })
  }, [])

  const name = displayName ?? 'Студент'

  const handleLogout = () => {
    clear()
    navigate(`/${tenantId}/login`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-canvas-dark/50 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
              <BookOpen size={18} className="text-amber-light" />
            </div>
            <span className="font-display text-xl text-ink">Навчальний портал</span>
          </div>
          <button onClick={handleLogout} className="btn-ghost btn-sm">
            <LogOut size={16} />
            Вийти
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="page-title">Вітаємо, {name}!</h1>
        <p className="page-subtitle">Ваші курси</p>

        {error && (
          <div className="mt-6 p-3 rounded-xl bg-coral-pale text-coral text-sm max-w-md">
            {error}
          </div>
        )}

        {courses === null && !error && (
          <div className="mt-10 flex items-center gap-2 text-ink-muted">
            <Loader2 size={18} className="animate-spin" />
            Завантаження…
          </div>
        )}

        {courses !== null && courses.length === 0 && (
          <div className="mt-10 card p-8 text-ink-muted">
            Вас поки не зараховано на жоден курс.
          </div>
        )}

        {courses !== null && courses.length > 0 && (
          <ul className="mt-10 space-y-3">
            {courses.map((course) => (
              <li key={course.id}>
                <button
                  onClick={() => navigate(`/${tenantId}/courses/${course.id}`)}
                  className="card w-full p-5 flex items-center justify-between text-left
                             hover:border-navy/30 transition-colors"
                >
                  <span className="font-display text-lg text-ink">{course.title}</span>
                  <ChevronRight size={20} className="text-ink-muted shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
