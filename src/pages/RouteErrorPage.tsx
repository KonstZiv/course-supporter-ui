import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ContactAdmin } from '../components/ui/ContactAdmin'
import { EmptyState } from '../components/ui/EmptyState'
import { useCourseStore } from '../stores/course'

export const ROUTE_ERROR_MESSAGE =
  'Сторінку не вдалося показати. Оновіть її; якщо повториться, напишіть нам.'

// Shown by the data router (src/router.tsx) when a page fails to render, in
// place of its default English "Unexpected Application Error!" (task 07c).
// The author reads what happened and what to do, not the error itself; the
// error goes to the console, where the router's own screen would have shown it.
export function RouteErrorPage() {
  const error = useRouteError()
  useEffect(() => {
    console.error('Page failed to render', error)
  }, [error])

  const courseTitle = useCourseStore.getState().tree?.title ?? null

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <EmptyState
        icon={AlertTriangle}
        title="Щось пішло не так"
        description={ROUTE_ERROR_MESSAGE}
        action={
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Оновити сторінку
            </button>
            <ContactAdmin
              message={ROUTE_ERROR_MESSAGE}
              context={{ course: courseTitle }}
              fallback="after-click"
            />
          </div>
        }
      />
    </div>
  )
}
