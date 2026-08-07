import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the api + the polling primitive (project convention — no msw). Mocking
// usePolling lets us drive ticks by hand and read the cadence it is handed,
// testing the speed logic deterministically without wall-clock timers.
const { listMock, usePollingMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  usePollingMock: vi.fn(),
}))
vi.mock('../api/jobs', () => ({ jobsApi: { list: listMock } }))
vi.mock('./usePolling', () => ({ usePolling: usePollingMock }))

import { useActivityStrip, hasLiveWork } from './useActivityStrip'
import type { JobListItemResponse, JobState, JobListResponse } from '../types/api'

function job(job_state: JobState): JobListItemResponse {
  return {
    id: `j-${job_state}`,
    job_type: 'document_processing',
    job_state,
    queued_at: '2026-08-01T00:00:00Z',
    started_at: null,
    completed_at: null,
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

function page(items: JobListItemResponse[]): JobListResponse {
  return { items, total: items.length, limit: 50, offset: 0 }
}

// The tick + cadence usePolling was last handed.
function lastPoll(): { tick: () => Promise<boolean>; intervalMs: number; enabled: boolean } {
  const calls = usePollingMock.mock.calls
  const [tick, intervalMs, enabled] = calls[calls.length - 1] as [
    () => Promise<boolean>,
    number,
    boolean,
  ]
  return { tick, intervalMs, enabled }
}

const FAST_MS = 4000
const SLOW_MS = 60000

describe('hasLiveWork', () => {
  it('is false for an empty list', () => {
    expect(hasLiveWork([])).toBe(false)
  })

  it('is true when any job is queued or processing', () => {
    expect(hasLiveWork([job('ready'), job('queued')])).toBe(true)
    expect(hasLiveWork([job('processing')])).toBe(true)
  })

  it('is false when every job is terminal', () => {
    expect(
      hasLiveWork([job('ready'), job('error'), job('cancelled'), job('obsolete')]),
    ).toBe(false)
  })
})

describe('useActivityStrip', () => {
  beforeEach(() => {
    listMock.mockReset()
    usePollingMock.mockReset()
  })

  it('mounts exactly one enabled poll, slow while idle', () => {
    renderHook(() => useActivityStrip())
    expect(usePollingMock).toHaveBeenCalled()
    const { intervalMs, enabled } = lastPoll()
    expect(enabled).toBe(true)
    expect(intervalMs).toBe(SLOW_MS)
  })

  it('reads the door with a three-day-back completed_after and the page limit', async () => {
    listMock.mockResolvedValue(page([]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(listMock).toHaveBeenCalledTimes(1)
    const [arg] = listMock.mock.calls[0] as [{ completed_after: string; limit: number }]
    expect(arg.limit).toBe(50)
    // One window for both floors (Р3 narrowed 2026-08-07): three days, not a week.
    const ageMs = Date.now() - Date.parse(arg.completed_after)
    expect(Math.abs(ageMs - 3 * 24 * 60 * 60 * 1000)).toBeLessThan(60_000)
  })

  it('flips to fast when live work appears, back to slow when it clears', async () => {
    listMock.mockResolvedValueOnce(page([job('processing')]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(lastPoll().intervalMs).toBe(FAST_MS)

    listMock.mockResolvedValueOnce(page([job('ready')]))
    await act(async () => {
      await lastPoll().tick()
    })
    expect(lastPoll().intervalMs).toBe(SLOW_MS)
  })

  it('keeps the last successful cadence when a poll fails (В2 invariant)', async () => {
    listMock.mockResolvedValueOnce(page([job('processing')]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(lastPoll().intervalMs).toBe(FAST_MS)

    // A failed poll must not flip the cadence: items stay at the last success,
    // so a network blip never toggles speeds (and never fires a request per toggle).
    listMock.mockRejectedValueOnce(new Error('network'))
    await act(async () => {
      await expect(lastPoll().tick()).rejects.toThrow('network')
    })
    expect(lastPoll().intervalMs).toBe(FAST_MS)
  })
})
