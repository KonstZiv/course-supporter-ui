import { describe, it, expect } from 'vitest'
import { deriveFloors } from './activityFloors'
import type { JobListItemResponse, JobState } from '../types/api'

const BASE = Date.parse('2026-08-07T12:00:00Z')

function at(offsetMs: number): string {
  return new Date(BASE + offsetMs).toISOString()
}

let seq = 0
function mk(
  job_state: JobState,
  opts: { queued: number; completed?: number } = { queued: 0 },
): JobListItemResponse {
  seq += 1
  return {
    id: `j-${seq}`,
    job_type: 'document_processing',
    job_state,
    queued_at: at(opts.queued),
    started_at: null,
    completed_at: opts.completed === undefined ? null : at(opts.completed),
    subject_type: 'authored_document',
    subject_id: 's',
    material_id: 'm',
    display_name: 'file.txt',
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: 'text',
    base_version: null,
    current_stage: null,
    stage_progress: null,
  }
}

const DAY = 24 * 60 * 60 * 1000

describe('deriveFloors', () => {
  it('empty list → no headline, no more, empty detail', () => {
    expect(deriveFloors([])).toEqual({
      headline: null,
      moreCount: 0,
      detailed: [],
    })
  })

  it('headline is the newest live job even when a completed one is more recent', () => {
    const olderLive = mk('processing', { queued: -2 * DAY })
    const newerDone = mk('ready', { queued: -1 * DAY, completed: -1 * DAY })
    const { headline } = deriveFloors([newerDone, olderLive])
    expect(headline).toBe(olderLive)
  })

  it('falls back to the newest completed when nothing is live', () => {
    const older = mk('ready', { queued: -5 * DAY, completed: -5 * DAY })
    const newer = mk('error', { queued: -2 * DAY, completed: -2 * DAY })
    const { headline } = deriveFloors([older, newer])
    expect(headline).toBe(newer)
  })

  // Week split gone (Р3 narrowed 2026-08-07): the door owns the window, so the
  // detailed floor is the WHOLE loaded list — no client-side three-day slice. An
  // older completed row (which the removed slice would have dropped) still opens.
  it('detailed floor is the whole window, live first — no client slice', () => {
    const live = mk('processing', { queued: -10 * 60 * 1000 })
    const within = mk('ready', { queued: -1 * DAY, completed: -1 * DAY })
    const older = mk('ready', { queued: -5 * DAY, completed: -5 * DAY })
    const { detailed } = deriveFloors([within, older, live])
    expect(detailed).toEqual([live, within, older])
    expect(detailed).toContain(older)
    expect(detailed).toHaveLength(3)
  })

  // Positive control: N must equal what the detailed floor opens beyond the one
  // visible headline. This assertion goes RED on the pre-fix formula
  // (moreCount = items.length - 1 against a three-day-sliced detailed floor),
  // where an older completed row inflated N above the rows actually shown.
  it('"і ще N" reconciles with the panel row count exactly, with no remainder', () => {
    const items = [
      mk('processing', { queued: -10 * 60 * 1000 }),
      mk('ready', { queued: -1 * DAY, completed: -1 * DAY }),
      mk('ready', { queued: -2 * DAY, completed: -2 * DAY }),
      mk('ready', { queued: -5 * DAY, completed: -5 * DAY }), // pre-fix slice dropped this
    ]
    const { moreCount, detailed } = deriveFloors(items)
    // detailed floor opens the whole window; nothing sliced away.
    expect(detailed).toHaveLength(items.length)
    // N = rows the panel opens minus the single visible headline.
    expect(moreCount).toBe(detailed.length - 1)
    // collapsed shows 1 (headline) + promises N; opening shows exactly 1 + N.
    expect(1 + moreCount).toBe(detailed.length)
  })

  it('a single loaded row shows no "і ще N"', () => {
    const { moreCount } = deriveFloors([mk('processing')])
    expect(moreCount).toBe(0)
  })
})
