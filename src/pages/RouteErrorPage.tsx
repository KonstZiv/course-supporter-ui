import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ContactAdmin } from '../components/ui/ContactAdmin'
import { EmptyState } from '../components/ui/EmptyState'
import { SiteFooter } from '../components/site/SiteFooter'
import { useCourseStore } from '../stores/course'
import { useT } from '../i18n/LanguageContext'

// Shown by the data router (src/router.tsx) when a page fails to render, in
// place of its default English "Unexpected Application Error!" (task 07c).
// The author reads what happened and what to do, not the error itself; the
// error goes to the console, where the router's own screen would have shown it.
export function RouteErrorPage() {
  const error = useRouteError()
  const t = useT()

  useEffect(() => {
    console.error('Page failed to render', error)
  }, [error])

  const courseTitle = useCourseStore.getState().tree?.title ?? null
  const routeErrorMessage = t('panel.routeError.description')

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={AlertTriangle}
          title={t('panel.routeError.title')}
          description={routeErrorMessage}
          action={
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                {t('panel.routeError.reloadButton')}
              </button>
              <ContactAdmin
                message={routeErrorMessage}
                context={{ course: courseTitle }}
                fallback="after-click"
              />
            </div>
          }
        />
      </div>
      <SiteFooter />
    </div>
  )
}
