import { describe, it, expect } from 'vitest'
import { workProgressBar, nodeVisitTally, progressUnitWord } from './workProgress'
import type { JobListItemResponse, JobState, AuthorJobType } from '../types/api'

function job(
  overrides: Partial<JobListItemResponse> & {
    job_type: AuthorJobType
    job_state: JobState
  },
): JobListItemResponse {
  return {
    id: 'j',
    queued_at: '2026-08-01T00:00:00Z',
    started_at: '2026-08-01T00:00:00Z',
    completed_at: null,
    subject_type: null,
    subject_id: null,
    material_id: null,
    display_name: null,
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: null,
    base_version: null,
    current_stage: null,
    stage_progress: null,
    ...overrides,
  }
}

const detecting = { stage: 'detecting', current: 240, total: 1800, unit: 'frames' }

describe('workProgressBar (Д2 appearance rule)', () => {
  it('video during detection (live, current stage) → a frame bar', () => {
    const bar = workProgressBar(
      job({
        job_type: 'document_processing',
        job_state: 'processing',
        current_stage: 'detecting',
        stage_progress: detecting,
      }),
    )
    expect(bar).toEqual({ current: 240, total: 1800, unit: 'frame' })
  })

  it('video past detection: frozen counter, stage advanced → no bar (Д2 freeze)', () => {
    // stage_progress still reads detecting; current_stage moved on.
    const bar = workProgressBar(
      job({
        job_type: 'document_processing',
        job_state: 'processing',
        current_stage: 'creating_segments',
        stage_progress: { ...detecting, current: 1800 },
      }),
    )
    expect(bar).toBeNull()
  })

  it('terminal video keeps frozen progress but shows no bar', () => {
    const bar = workProgressBar(
      job({
        job_type: 'document_processing',
        job_state: 'ready',
        current_stage: 'creating_segments',
        stage_progress: { ...detecting, current: 1800 },
      }),
    )
    expect(bar).toBeNull()
  })

  it('non-video document_processing (no stage_progress) → no bar', () => {
    const bar = workProgressBar(
      job({
        job_type: 'document_processing',
        job_state: 'processing',
        current_stage: 'extracting_structure',
        stage_progress: null,
      }),
    )
    expect(bar).toBeNull()
  })

  it('node-summary during a pass → a derived node bar (Д3)', () => {
    const bar = workProgressBar(
      job({
        job_type: 'node_summary_regeneration',
        job_state: 'processing',
        current_stage: 'bottomup',
        stage_progress: {
          pass1: { a: 'done', b: 'done', c: 'pending' },
          pass2: { a: 'pending', b: 'pending', c: 'pending' },
        },
      }),
    )
    // 2 resolved of 6 visits across both passes.
    expect(bar).toEqual({ current: 2, total: 6, unit: 'node' })
  })

  it('node-summary with no pass yet executing → no bar', () => {
    const bar = workProgressBar(
      job({
        job_type: 'node_summary_regeneration',
        job_state: 'processing',
        current_stage: null,
        stage_progress: { pass1: {}, pass2: {} },
      }),
    )
    expect(bar).toBeNull()
  })

  it('document_preparation and base_normalize never carry a bar', () => {
    for (const job_type of ['document_preparation', 'base_normalize'] as const) {
      expect(
        workProgressBar(
          job({ job_type, job_state: 'processing', current_stage: 'x', stage_progress: { current: 1, total: 2 } }),
        ),
      ).toBeNull()
    }
  })
})

describe('nodeVisitTally (Д3 — stable denominator, both passes)', () => {
  const nine = (v: string): Record<string, string> =>
    Object.fromEntries('123456789'.split('').map((k) => [k, v]))
  const scope9 = { in_scope_node_ids: '123456789'.split(''), uncovered_stale_node_ids: [] }

  it('keeps the denominator stable during bottomup — pass2 empty, no jump-back', () => {
    // Defect caught in live acceptance (2026-08-13): mid-bottomup pass1 holds all
    // 9 nodes (8 resolved), pass2 is still empty. The denominator must already be
    // 2×9 = 18 from the scope — NOT 9 (len pass1+pass2) — else it grows to 18 when
    // topdown starts and the bar fills to 8/9 then jumps back to 8/18 (Д3 forbids).
    const tally = nodeVisitTally({
      scope: scope9,
      pass1: { ...nine('done'), '9': 'pending' },
      pass2: {},
    })
    expect(tally).toEqual({ done: 8, total: 18 })
  })

  it('the same run at completion reads full — denominator unchanged (18)', () => {
    const tally = nodeVisitTally({
      scope: scope9,
      pass1: nine('done'),
      pass2: { ...nine('done'), '1': 'not_applicable' },
    })
    expect(tally).toEqual({ done: 18, total: 18 })
  })

  it('counts non-pending across both passes; not_applicable/skipped/error all resolve', () => {
    const tally = nodeVisitTally({
      scope: { in_scope_node_ids: ['a', 'b', 'c'], uncovered_stale_node_ids: [] },
      pass1: { a: 'done', b: 'skipped_memo', c: 'not_applicable' },
      pass2: { a: 'error', b: 'pending', c: 'pending' },
    })
    expect(tally).toEqual({ done: 4, total: 6 })
  })

  it('falls back to 2× the larger pre-populated pass map when scope is absent', () => {
    // pass1 pre-populated (2 nodes), pass2 empty → 2×2 = 4, still stable.
    const tally = nodeVisitTally({ pass1: { a: 'error', b: 'done' }, pass2: {} })
    expect(tally).toEqual({ done: 2, total: 4 })
  })

  it('missing pass maps → null', () => {
    expect(nodeVisitTally({})).toBeNull()
    expect(nodeVisitTally({ pass1: {} })).toBeNull()
  })
})

describe('progressUnitWord (Д5 product language)', () => {
  it('maps the internal token to a product word', () => {
    expect(progressUnitWord('frame')).toBe('кадр')
    expect(progressUnitWord('node')).toBe('вузол')
  })
})
