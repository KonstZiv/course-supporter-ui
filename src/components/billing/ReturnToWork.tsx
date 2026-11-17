import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE_TEXT_LINK_CLASS } from '../site/siteLinks'

/** How long after `window.close()` a tab still in view counts as not closed. */
export const CLOSE_CHECK_MS = 300

export const RETURN_TO_WORK = 'Повернутись до роботи'

/** When the tab could not be closed: where the author's action waits. */
export const RETURN_TO_ACTION_TAB =
  'Якщо ви прийшли сюди з іншої сторінки програми, поверніться на ту вкладку й запустіть дію ще раз.'

/**
 * "Повернутись до роботи" once the units are credited. An author who ran short
 * of units opened the purchase from a paid action in a new tab: closing it
 * brings them back to that action. A browser closes only a tab a script
 * opened; when the page is still in view after a moment, the button gives way
 * to where the action waits, and a link to the courses. (The portal has its
 * own, with the student's words.)
 */
export function ReturnToWork() {
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
        <p>{RETURN_TO_ACTION_TAB}</p>
        <Link to="/" className={SITE_TEXT_LINK_CLASS}>
          Мої курси
        </Link>
      </div>
    )
  }
  return (
    <button type="button" className="btn-primary btn-sm" onClick={goBack}>
      {RETURN_TO_WORK}
    </button>
  )
}
