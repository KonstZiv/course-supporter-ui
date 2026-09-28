import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'

// Shown by the data router (src/router.tsx) when a page fails to render, in
// place of its default English "Unexpected Application Error!" (task 07c).
// The author reads what happened and what to do, not the error itself; the
// error goes to the console, where the router's own screen would have shown it.
export function RouteErrorPage() {
  const error = useRouteError()
  useEffect(() => {
    console.error('Page failed to render', error)
  }, [error])
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <EmptyState
        icon={AlertTriangle}
        title="Щось пішло не так"
        description="Сторінку не вдалося показати. Оновіть її; якщо повториться, напишіть нам."
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Оновити сторінку
          </button>
        }
      />
    </div>
  )
}
