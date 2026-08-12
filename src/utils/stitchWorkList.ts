import type { JobListItemResponse } from '../types/api'

// Д9 — stitch the shell poll's two reads into one list.
//
// The door page is ordered by queue time and capped at fifty rows, and it
// bounds only FINISHED work by the three-day window (an in-flight row always
// passes the time bound). But the cap is not by state: a long-lived live job
// queued before fifty later ones falls off the page. So the poll reads twice —
// the three-day window AND a narrow "currently working" read with no time
// bound — and stitches them here, de-duplicated by job id. Without this, a
// mass upload (long video queued first, dozens of small docs finishing after)
// would drop the still-running video from the strip and the card, showing two
// in-flight materials with different detail and no explanation for the author.
//
// The live read wins on a row present in both: both reads fire in one cycle, so
// they are near-simultaneous, but the state-filtered read is the authoritative
// "in flight now" view. Order is irrelevant here — ``deriveFloors`` re-sorts by
// activity time — so this only needs to be the de-duplicated union; "і ще N"
// counts THIS union, never one read (else the 2026-08-07 miscount returns).
export function stitchWorkList(
  windowItems: JobListItemResponse[],
  liveItems: JobListItemResponse[],
): JobListItemResponse[] {
  const byId = new Map<string, JobListItemResponse>()
  for (const j of windowItems) byId.set(j.id, j)
  for (const j of liveItems) byId.set(j.id, j)
  return [...byId.values()]
}
