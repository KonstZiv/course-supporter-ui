import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { JobResponse, JobStatus } from '../types/api'

// Manual mock of the api/jobs module (project convention — no msw). The
// hoisted ``getMock`` is configured per test.
const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))
vi.mock('../api/jobs', () => ({ jobsApi: { get: getMock } }))

import { useJobPolling } from './useJobPolling'

function makeJob(status: JobStatus): JobResponse {
  return {
    id: 'job-1',
    job_type: 'node_summary_regeneration',
    priority: 'normal',
    status,
    tenant_id: null,
    course_node_id: null,
    arq_job_id: null,
    current_stage: null,
    stage_progress: null,
    result_data: null,
    error_message: null,
    queued_at: '2026-06-13T00:00:00Z',
    started_at: null,
    completed_at: null,
  }
}

const POLL_MS = 5000

describe('useJobPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    getMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not poll when jobId is null', async () => {
    renderHook(() => useJobPolling(null, null))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 2)
    })
    expect(getMock).not.toHaveBeenCalled()
  })

  it('polls while active and stops on complete', async () => {
    getMock
      .mockResolvedValueOnce(makeJob('active'))
      .mockResolvedValueOnce(makeJob('complete'))

    const { result } = renderHook(() =>
      useJobPolling('job-1', makeJob('queued')),
    )

    // First tick fires immediately (usePolling calls tick() in-effect).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getMock).toHaveBeenCalledTimes(1)
    expect(result.current?.status).toBe('active')

    // Next tick after the interval → complete → terminal.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    expect(getMock).toHaveBeenCalledTimes(2)
    expect(result.current?.status).toBe('complete')

    // No further polling once terminal.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3)
    })
    expect(getMock).toHaveBeenCalledTimes(2)
  })

  it('stops on failed', async () => {
    getMock.mockResolvedValueOnce(makeJob('failed'))

    const { result } = renderHook(() =>
      useJobPolling('job-1', makeJob('queued')),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(getMock).toHaveBeenCalledTimes(1)
    expect(result.current?.status).toBe('failed')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3)
    })
    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('seeds from the initial 202 payload before the first poll resolves', () => {
    getMock.mockResolvedValue(makeJob('active'))
    const { result } = renderHook(() =>
      useJobPolling('job-1', makeJob('queued')),
    )
    // Synchronously returns the seeded job (render starts from real data).
    expect(result.current?.status).toBe('queued')
  })
})
