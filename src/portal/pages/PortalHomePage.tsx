import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import { usePortalSession } from '../stores/session'
import { portalApi, PortalApiError } from '../api/portalClient'
import { PortalHeader } from '../components/PortalHeader'
import { RecoveryEmailSection } from '../components/RecoveryEmailSection'
import type { PortalCourseListItem } from '../types'
import { useAvailableUnits, useStudentOutlook } from '../hooks/useStudentOutlook'
import { UnitsReminders } from '../components/billing/UnitsReminders'
import { SITE_TEXT_LINK_CLASS } from '../../components/site/siteLinks'
import { availableLine, BUY_UNITS } from '../unitsTexts'

/**
 * Under the greeting, for a student who pays for their reviews: what is
 * available and how many reviews it covers, and the reminders. Nothing while
 * the answers are on their way, when one failed, when the author pays, or
 * while charging is off (operator 2026-11-16, A).
 */
function UnitsOutlook({ tenantId }: { tenantId: string | undefined }) {
  const { outlook } = useStudentOutlook()
  const available = useAvailableUnits()
  if (outlook?.paid_by !== 'self' || !outlook.charging_enabled) return null
  const units = `/${tenantId}/billing`
  return (
    <div className="mt-4">
      <UnitsReminders
        outlook={outlook}
        lead={available === null ? null : availableLine(available, outlook.reviews_left)}
        buy={
          <Link to={units} className={SITE_TEXT_LINK_CLASS}>
            {BUY_UNITS}
          </Link>
        }
        units={
          <Link to={units} className={SITE_TEXT_LINK_CLASS}>
            Юніти
          </Link>
        }
      />
    </div>
  )
}

// Portal landing (Phase 6 / T4b, c2): the student's enrolled courses
// (GET /portal/courses). The greeting name comes from the session store
// (set at login) — no /me round-trip needed (ratify Q5). Click a course →
// its material tree.
export function PortalHomePage() {
  const { tenantId } = useParams()
  const displayName = usePortalSession((s) => s.displayName)
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

  return (
    <div className="min-h-screen bg-canvas">
      <PortalHeader current="courses" />

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="page-title">Вітаємо, {name}!</h1>
        <UnitsOutlook tenantId={tenantId} />
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

        <RecoveryEmailSection />
      </main>
    </div>
  )
}
