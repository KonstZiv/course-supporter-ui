import { describe, it, expect } from 'vitest'
import { deriveFloors } from './activityFloors'
import type { JobListItemResponse, JobState } from '../types/api'

const NOW = Date.parse('2026-08-07T12:00:00Z')

function at(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString()
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
    expect(deriveFloors([], NOW)).toEqual({
      headline: null,
      moreCount: 0,
      detailed: [],
    })
  })

  it('headline is the newest live job even when a completed one is more recent', () => {
    const olderLive = mk('processing', { queued: -2 * DAY })
    const newerDone = mk('ready', { queued: -1 * DAY, completed: -1 * DAY })
    const { headline } = deriveFloors([newerDone, olderLive], NOW)
    expect(headline).toBe(olderLive)
  })

  it('falls back to the newest completed when nothing is live', () => {
    const older = mk('ready', { queued: -5 * DAY, completed: -5 * DAY })
    const newer = mk('error', { queued: -2 * DAY, completed: -2 * DAY })
    const { headline } = deriveFloors([older, newer], NOW)
    expect(headline).toBe(newer)
  })

  it('detailed floor keeps live + completed within three days, live first', () => {
    const live = mk('processing', { queued: -10 * 60 * 1000 })
    const within = mk('ready', { queued: -1 * DAY, completed: -1 * DAY })
    const beyond = mk('ready', { queued: -5 * DAY, completed: -5 * DAY })
    const { detailed } = deriveFloors([within, beyond, live], NOW)
    expect(detailed).toEqual([live, within])
    expect(detailed).not.toContain(beyond)
  })

  it('"і ще N" counts the loaded list beyond the single headline, not the door total', () => {
    const items = [
      mk('processing', { queued: -1 }),
      mk('ready', { queued: -2, completed: -2 }),
      mk('ready', { queued: -3, completed: -3 }),
    ]
    const { moreCount } = deriveFloors(items, NOW)
    expect(moreCount).toBe(2)
  })

  it('a single loaded row shows no "і ще N"', () => {
    const { moreCount } = deriveFloors([mk('processing')], NOW)
    expect(moreCount).toBe(0)
  })
})
