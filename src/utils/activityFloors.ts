import type { JobListItemResponse } from '../types/api'

// The strip's two floors are derived over ONE loaded list (§2): the collapsed
// floor summarises the week, the detailed floor shows live work plus the last
// three days. Pure functions — the poll and the display consume them; ``now`` is
// injected so the three-day boundary is testable without wall-clock.

const DAY_MS = 24 * 60 * 60 * 1000
const DETAIL_WINDOW_DAYS = 3

function isLive(j: JobListItemResponse): boolean {
  return j.job_state === 'queued' || j.job_state === 'processing'
}

// Activity time: a terminal's completion, or the queue time when it never ran /
// is still live (a live row has no completion). Used for ordering and the
// three-day cut.
function activityTime(j: JobListItemResponse): number {
  return Date.parse(j.completed_at ?? j.queued_at)
}

function byActivityDesc(a: JobListItemResponse, b: JobListItemResponse): number {
  return activityTime(b) - activityTime(a)
}

export interface ActivityFloors {
  /** Collapsed floor: the single newest live job, else the newest of the week. */
  headline: JobListItemResponse | null
  /** "І ще N" — loaded rows beyond the one visible headline (Р4), not the door total. */
  moreCount: number
  /** Detailed floor: live work first, then completed within three days, newest first. */
  detailed: JobListItemResponse[]
}

export function deriveFloors(
  items: JobListItemResponse[],
  now: number,
): ActivityFloors {
  const live = items.filter(isLive).sort(byActivityDesc)
  const completed = items.filter((j) => !isLive(j)).sort(byActivityDesc)

  // Headline: newest live, else newest completed anywhere in the loaded week.
  const headline = live[0] ?? completed[0] ?? null

  const cutoff = now - DETAIL_WINDOW_DAYS * DAY_MS
  const recentCompleted = completed.filter((j) => activityTime(j) >= cutoff)
  const detailed = [...live, ...recentCompleted]

  // Counted from the loaded list, never the door's ``total`` (Р4): with only the
  // headline visible in the collapsed floor, that is everything else loaded.
  const moreCount = headline ? items.length - 1 : 0

  return { headline, moreCount, detailed }
}
