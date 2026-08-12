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
import { useWorkListStore } from '../stores/workList'
import type { JobListItemResponse, JobState, JobListResponse } from '../types/api'

function job(id: string, job_state: JobState): JobListItemResponse {
  return {
    id,
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
    expect(hasLiveWork([job('r', 'ready'), job('q', 'queued')])).toBe(true)
    expect(hasLiveWork([job('p', 'processing')])).toBe(true)
  })

  it('is false when every job is terminal', () => {
    expect(
      hasLiveWork([
        job('r', 'ready'),
        job('e', 'error'),
        job('c', 'cancelled'),
        job('o', 'obsolete'),
      ]),
    ).toBe(false)
  })
})

describe('useActivityStrip', () => {
  beforeEach(() => {
    listMock.mockReset()
    usePollingMock.mockReset()
    useWorkListStore.setState({ items: [], refreshNonce: 0 })
  })

  it('mounts exactly one enabled poll, slow while idle', () => {
    renderHook(() => useActivityStrip())
    expect(usePollingMock).toHaveBeenCalled()
    const { intervalMs, enabled } = lastPoll()
    expect(enabled).toBe(true)
    expect(intervalMs).toBe(SLOW_MS)
  })

  it('reads the door twice per cycle: the three-day window and a live-state read (Д9)', async () => {
    listMock.mockResolvedValue(page([]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(listMock).toHaveBeenCalledTimes(2)

    // Read 1 — the three-day window: completed_after set, no state filter.
    const [windowArg] = listMock.mock.calls[0] as [
      { completed_after?: string; limit: number; state_class?: string },
    ]
    expect(windowArg.limit).toBe(50)
    expect(windowArg.state_class).toBeUndefined()
    const ageMs = Date.now() - Date.parse(windowArg.completed_after as string)
    expect(Math.abs(ageMs - 3 * 24 * 60 * 60 * 1000)).toBeLessThan(60_000)

    // Read 2 — the narrow live read: state = in flight, NO time bound (Д9).
    const [liveArg] = listMock.mock.calls[1] as [
      { completed_after?: string; limit: number; state_class?: string },
    ]
    expect(liveArg.state_class).toBe('in_flight')
    expect(liveArg.completed_after).toBeUndefined()
    expect(liveArg.limit).toBe(50)
  })

  it('writes the stitched union of both reads into the shared store', async () => {
    // Window read has a finished doc; the live read has an old running video
    // absent from the window — the store must hold both (Д9 survival).
    listMock
      .mockResolvedValueOnce(page([job('doc', 'ready')]))
      .mockResolvedValueOnce(page([job('video', 'processing')]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(
      useWorkListStore
        .getState()
        .items.map((j) => j.id)
        .sort(),
    ).toEqual(['doc', 'video'])
  })

  it('flips to fast when live work appears, back to slow when it clears', async () => {
    listMock
      .mockResolvedValueOnce(page([job('p', 'processing')]))
      .mockResolvedValueOnce(page([]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(lastPoll().intervalMs).toBe(FAST_MS)

    listMock
      .mockResolvedValueOnce(page([job('r', 'ready')]))
      .mockResolvedValueOnce(page([]))
    await act(async () => {
      await lastPoll().tick()
    })
    expect(lastPoll().intervalMs).toBe(SLOW_MS)
  })

  it('reads immediately, off-schedule, when a trigger wakes the loop (Д10)', async () => {
    listMock.mockResolvedValue(page([]))
    renderHook(() => useActivityStrip())
    // usePolling is mocked → no mount read; only the wake fires a real tick, and
    // it is the same two-read cycle (Д9), just off the schedule.
    await act(async () => {
      useWorkListStore.getState().requestRefresh()
    })
    expect(listMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the last successful cadence when a read fails (В2 invariant)', async () => {
    listMock
      .mockResolvedValueOnce(page([job('p', 'processing')]))
      .mockResolvedValueOnce(page([]))
    renderHook(() => useActivityStrip())
    await act(async () => {
      await lastPoll().tick()
    })
    expect(lastPoll().intervalMs).toBe(FAST_MS)

    // A failed read must not flip the cadence: Promise.all rejects before the
    // store is written, so the last-success list (and its speed) stands.
    listMock.mockRejectedValueOnce(new Error('network'))
    listMock.mockResolvedValueOnce(page([]))
    await act(async () => {
      await expect(lastPoll().tick()).rejects.toThrow('network')
    })
    expect(lastPoll().intervalMs).toBe(FAST_MS)
  })
})
