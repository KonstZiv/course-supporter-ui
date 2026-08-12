import { useCallback, useMemo } from 'react'
import { usePolling } from './usePolling'
import { jobsApi } from '../api/jobs'
import { useWorkListStore } from '../stores/workList'
import { stitchWorkList } from '../utils/stitchWorkList'
import type { JobListItemResponse } from '../types/api'

// Poll cadences (В2, ratified 2026-08-07). Fast matches the tree loop so a live
// job surfaces at the rhythm the canvas already refreshes; slow keeps the idle
// strip quiet. The primitive recreates the loop on a cadence change (accepted:
// the extra read on a transition is harmless, and on idle→live it is useful).
const FAST_MS = 4000
const SLOW_MS = 60000

// The one window both floors read (Р3, narrowed 2026-08-07): live work plus
// completed within three days. Work older than three days is not in the strip;
// the author finds it on the history page (Р6, step Г).
const WINDOW_MS = 3 * 24 * 60 * 60 * 1000

// One page per read. "І ще N" counts loaded rows beyond the visible ones (Р4),
// so this cap is the ceiling of what the strip can enumerate. No infinite
// scroll / "show more" in step В.
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
 * survives child-route changes (В3). The ONE writer of the shared work-list
 * store (Д8): every progress surface reads the store, not this hook's return.
 *
 * Д9 — two reads per cycle: the three-day window plus a narrow "currently
 * working" read with no time bound, stitched with dedup so a long-lived live
 * job past the window page's fifty-row cap is never lost. A failed read leaves
 * the store (and thus the cadence) unchanged — ``Promise.all`` rejects before
 * ``setItems`` runs, and the primitive swallows the error and retries (§2
 * silent failure). The strip still receives ``items`` for its existing prop
 * chain; new consumers subscribe to the store directly.
 */
export function useActivityStrip(): ActivityStripData {
  const items = useWorkListStore((s) => s.items)
  const setItems = useWorkListStore((s) => s.setItems)

  // Cadence derives from the stored list only — set on success alone, so a
  // failed read leaves it (and thus the speed) unchanged.
  const intervalMs = useMemo(
    () => (hasLiveWork(items) ? FAST_MS : SLOW_MS),
    [items],
  )

  const tick = useCallback(async (): Promise<boolean> => {
    // Absolute lower bound computed client-side: the door bounds only finished
    // work by it; live work always passes. The second read (state = in flight,
    // no time bound) guarantees a long-lived live job survives the fifty-row
    // cap; the two are stitched with dedup by job id (Д9).
    const completed_after = new Date(Date.now() - WINDOW_MS).toISOString()
    const [windowPage, livePage] = await Promise.all([
      jobsApi.list({ completed_after, limit: PAGE_LIMIT }),
      jobsApi.list({ state_class: 'in_flight', limit: PAGE_LIMIT }),
    ])
    setItems(stitchWorkList(windowPage.items, livePage.items))
    return false // never self-terminates — polls for the whole session
  }, [setItems])

  usePolling(tick, intervalMs, true)

  return { items }
}
