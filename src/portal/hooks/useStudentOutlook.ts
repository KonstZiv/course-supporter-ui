import { useCallback, useEffect, useRef, useState } from 'react'
import { portalApi } from '../api/portalClient'
import type { PortalBillingBalance, PortalBillingOutlook } from '../types'

/** Calls ``onVisible`` whenever the tab comes back into view. */
export function useOnVisible(onVisible: () => void) {
  const latest = useRef(onVisible)
  useEffect(() => {
    latest.current = onVisible
  }, [onVisible])
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') latest.current()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])
}

/**
 * The student's reminders (``GET /portal/billing/outlook``, without a course),
 * read when the page opens and whenever the tab comes back into view — the
 * units may have been bought in another tab. Null while there is no answer, or
 * the ask failed: the page then shows nothing of it.
 */
export function useStudentOutlook() {
  const [outlook, setOutlook] = useState<PortalBillingOutlook | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    try {
      const found = await portalApi.billingOutlook()
      if (alive.current) setOutlook(found)
    } catch {
      // Nothing to show; the next look tries again.
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])
  useOnVisible(() => void reload())

  return { outlook, reload }
}

/**
 * What is available, for "Мої курси": read with the outlook, and again
 * whenever the tab comes back into view. Null while there is no answer, or the
 * ask failed.
 */
export function useAvailableUnits() {
  const [balance, setBalance] = useState<PortalBillingBalance | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    try {
      const found = await portalApi.billingBalance()
      if (alive.current) setBalance(found)
    } catch {
      // Nothing to show; the next look tries again.
    }
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])
  useOnVisible(() => void reload())

  return balance?.available ?? null
}
