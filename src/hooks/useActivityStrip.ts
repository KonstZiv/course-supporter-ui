import { useCallback, useMemo, useState } from 'react'
import { usePolling } from './usePolling'
import { jobsApi } from '../api/jobs'
import type { JobListItemResponse } from '../types/api'

// Poll cadences (В2, ratified 2026-08-07). Fast matches the tree loop so a live
// job surfaces at the rhythm the canvas already refreshes; slow keeps the idle
// strip quiet. The primitive recreates the loop on a cadence change (accepted:
// the extra read on a transition is harmless, and on idle→live it is useful).
const FAST_MS = 4000
const SLOW_MS = 60000

// Widest floor the strip shows (Р3 / §2): one read per cycle with a week-back
// lower bound feeds both the week-wide collapsed floor and the three-day
// detailed floor; the split happens over the loaded list, not via a second read.
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// One page per cycle. "І ще N" counts loaded rows beyond the visible ones (Р4),
// never the response's total — so this cap is also the ceiling of what the strip
// can enumerate. No infinite scroll / "show more" in step В.
const PAGE_LIMIT = 50

/**
 * A job row is live when its work-state axis is still in flight. Live rows keep
 * the poll fast; terminals let it fall to the slow cadence. The flag is read off
 * the last successful list only (В2), so a failed poll never flips the cadence.
 */
export function hasLiveWork(items: JobListItemResponse[]): boolean {
  return items.some(
    (j) => j.job_state === 'queued' || j.job_state === 'processing',
  )
}

export interface ActivityStripData {
  items: JobListItemResponse[]
}

/**
 * Session-long poll of the flat work-list door, mounted in the shell so it
 * survives child-route changes (В3). Holds the last successful page; a failed
 * poll keeps the previous content and cadence (§2 silent failure — the primitive
 * swallows the error and retries). This hook only fetches and holds; the two
 * display floors are driven by consumers (В3).
 */
export function useActivityStrip(): ActivityStripData {
  const [items, setItems] = useState<JobListItemResponse[]>([])

  // Cadence derives from the last successful list only — items is set on
  // success alone, so a failed poll leaves it (and thus the speed) unchanged.
  const intervalMs = useMemo(
    () => (hasLiveWork(items) ? FAST_MS : SLOW_MS),
    [items],
  )

  const tick = useCallback(async (): Promise<boolean> => {
    // Absolute lower bound computed client-side (§2 / probe cross-check 1): the
    // door bounds only finished work by it; live work always passes.
    const completed_after = new Date(Date.now() - WINDOW_MS).toISOString()
    const page = await jobsApi.list({ completed_after, limit: PAGE_LIMIT })
    setItems(page.items)
    return false // never self-terminates — polls for the whole session
  }, [])

  usePolling(tick, intervalMs, true)

  return { items }
}
