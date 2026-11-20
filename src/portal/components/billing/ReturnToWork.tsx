import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SITE_TEXT_LINK_CLASS } from '../../../components/site/siteLinks'
import { useT } from '../../../i18n/LanguageContext'

/** How long after `window.close()` a tab still in view counts as not closed. */
export const CLOSE_CHECK_MS = 300

/**
 * "Повернутись до роботи" once the units are credited. A student who opened
 * the purchase from a task page did so in a new tab: closing it brings them
 * back to the task, where the chosen file waits. A browser closes only a tab
 * a script opened; when the page is still in view after a moment, the button
 * gives way to where the work waits, and a link to the courses.
 */
export function ReturnToWork() {
  const { tenantId } = useParams()
  const t = useT()
  const [stayed, setStayed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const goBack = () => {
    window.close()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (document.visibilityState === 'visible') setStayed(true)
    }, CLOSE_CHECK_MS)
  }

  if (stayed) {
    return (
      <div className="basis-full space-y-1">
        <p>{t('portal.billing.returnToTaskTab')}</p>
        <Link to={`/${tenantId}/home`} className={SITE_TEXT_LINK_CLASS}>
          {t('portal.nav.courses')}
        </Link>
      </div>
    )
  }
  return (
    <button type="button" className="btn-primary btn-sm" onClick={goBack}>
      {t('portal.billing.returnToWork')}
    </button>
  )
}
