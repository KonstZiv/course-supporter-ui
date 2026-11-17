import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useOutlookStore } from '../stores/billingOutlook'

/**
 * Asks for the outlook when the route changes and when the tab comes back into
 * view — no more often. Mounted once, in the shell (AppLayout); the pages read
 * the answer from `useOutlookStore`.
 */
export function useOutlookReader(): void {
  const { pathname } = useLocation()
  const refresh = useOutlookStore((s) => s.refresh)

  useEffect(() => {
    void refresh()
  }, [pathname, refresh])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refresh])

  // Leaving the program (the shell unmounts): the next author starts clean.
  useEffect(() => () => useOutlookStore.getState().reset(), [])
}
