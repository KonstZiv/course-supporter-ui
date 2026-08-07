import type { JobListItemResponse } from '../types/api'

// The strip's two floors read ONE window (§2 / Р3, narrowed 2026-08-07): the door
// call already bounds it to live work + completed within three days, so no
// client-side slicing remains. The collapsed floor summarises exactly the list
// the detailed floor opens — that is what makes "і ще N" reconcile by row count.
// Pure functions over the already-windowed list.

function isLive(j: JobListItemResponse): boolean {
  return j.job_state === 'queued' || j.job_state === 'processing'
}

// Activity time: a terminal's completion, or the queue time when it never ran /
// is still live (a live row has no completion). Used only for ordering now.
function activityTime(j: JobListItemResponse): number {
  return Date.parse(j.completed_at ?? j.queued_at)
}

function byActivityDesc(a: JobListItemResponse, b: JobListItemResponse): number {
  return activityTime(b) - activityTime(a)
}

export interface ActivityFloors {
  /** Collapsed floor: the single newest live job, else the newest of the window. */
  headline: JobListItemResponse | null
  /** "І ще N" — the rows the detailed floor opens beyond the one visible headline. */
  moreCount: number
  /** Detailed floor: the whole window, live first then completed, newest first. */
  detailed: JobListItemResponse[]
}

export function deriveFloors(items: JobListItemResponse[]): ActivityFloors {
  const live = items.filter(isLive).sort(byActivityDesc)
  const completed = items.filter((j) => !isLive(j)).sort(byActivityDesc)

  // The whole loaded window, in display order — no slice: what is loaded is what
  // opens. The headline is its first row (newest live, else newest completed),
  // i.e. the one row the collapsed floor already shows.
  const detailed = [...live, ...completed]
  const headline = detailed[0] ?? null

  // N = rows the detailed floor opens minus the one already visible in the
  // collapsed floor (the headline). Promise and opening reconcile with no
  // remainder because both read one list (Р4 / §2, 2026-08-07).
  const moreCount = detailed.length > 0 ? detailed.length - 1 : 0

  return { headline, moreCount, detailed }
}
