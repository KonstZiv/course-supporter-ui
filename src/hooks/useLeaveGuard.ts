import { useCallback, useEffect, useRef } from 'react'
import {
  useBlocker,
  useLocation,
  type Blocker,
  type BlockerFunction,
} from 'react-router-dom'

/**
 * Keep a page with unsaved changes from being left without a question
 * (task 07c, decision 12).
 *
 * A move inside the program — a link, the back button of the browser — is
 * held by the data router's ``useBlocker``: the page asks, then calls
 * ``blocker.proceed()`` or ``blocker.reset()``. Closing the tab or reloading
 * never reaches the router, so ``beforeunload`` asks the browser's own
 * question. ``allowNextMove`` lets through a move the page makes itself — to
 * a new test's own address after its first save, back to the course after
 * hiding the test — which would otherwise hold the page against itself.
 *
 * Leaving the program by the header's logout is a move to ``/logout`` like any
 * other, so it is held too; the key is dropped only once the move goes through.
 */
export function useLeaveGuard(unsaved: boolean): {
  blocker: Blocker
  allowNextMove: () => void
} {
  const unsavedRef = useRef(unsaved)
  unsavedRef.current = unsaved
  const allowed = useRef(false)
  const location = useLocation()

  // Read when a move starts, so a save that has just ended counts.
  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      unsavedRef.current &&
      !allowed.current &&
      currentLocation.pathname !== nextLocation.pathname,
    [],
  )
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    allowed.current = false
  }, [location.key])

  useEffect(() => {
    if (!unsaved) return
    const ask = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Older browsers ask only when returnValue is set.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [unsaved])

  const allowNextMove = useCallback(() => {
    allowed.current = true
  }, [])

  return { blocker, allowNextMove }
}
