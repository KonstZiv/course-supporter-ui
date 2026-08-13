import { describe, it, expect } from 'vitest'
import { stitchWorkList } from './stitchWorkList'
import { deriveFloors } from './activityFloors'
import type { JobListItemResponse, JobState } from '../types/api'

function job(id: string, job_state: JobState, queued_at: string): JobListItemResponse {
  return {
    id,
    job_type: 'document_processing',
    job_state,
    queued_at,
    started_at: null,
    completed_at: job_state === 'ready' ? queued_at : null,
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

describe('stitchWorkList (Д9)', () => {
  it('de-duplicates by job id — a row in both reads appears once', () => {
    const shared = job('a', 'processing', '2026-08-01T00:00:00Z')
    const stitched = stitchWorkList([shared, job('b', 'ready', '2026-08-02T00:00:00Z')], [shared])
    expect(stitched.map((j) => j.id).sort()).toEqual(['a', 'b'])
  })

  it('keeps a live job that is absent from the three-day window', () => {
    // The window read (finished + recent) does not carry the old live job; the
    // narrow state read does. The stitch must preserve it.
    const oldLive = job('video', 'processing', '2026-07-01T00:00:00Z')
    const windowItems = [job('doc1', 'ready', '2026-08-10T00:00:00Z')]
    const stitched = stitchWorkList(windowItems, [oldLive])
    expect(stitched.some((j) => j.id === 'video')).toBe(true)
  })

  it('the live read wins on conflict — its fresher status is kept', () => {
    const stale = job('a', 'queued', '2026-08-01T00:00:00Z')
    const fresh = { ...stale, job_state: 'processing' as JobState }
    const stitched = stitchWorkList([stale], [fresh])
    expect(stitched.find((j) => j.id === 'a')?.job_state).toBe('processing')
  })

  it('"і ще N" counts the stitched list, not one read', () => {
    // Two window rows plus one live-only row → three unique; the collapsed floor
    // shows one headline and promises "і ще 2" — reconciled against the union.
    const windowItems = [
      job('a', 'ready', '2026-08-10T00:00:00Z'),
      job('b', 'ready', '2026-08-09T00:00:00Z'),
    ]
    const liveItems = [job('c', 'processing', '2026-07-01T00:00:00Z')]
    const stitched = stitchWorkList(windowItems, liveItems)
    const floors = deriveFloors(stitched)
    expect(floors.detailed).toHaveLength(3)
    expect(floors.moreCount).toBe(stitched.length - 1)
    expect(floors.moreCount).toBe(2)
  })
})
