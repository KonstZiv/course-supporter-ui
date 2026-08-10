import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the fetch wrapper to break the transitive auth-store import and to
// assert the call shape (project convention — no msw).
const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))
vi.mock('./client', () => ({ api: { get: getMock } }))

import { jobsApi } from './jobs'

function calledUrl(): string {
  expect(getMock).toHaveBeenCalledTimes(1)
  const [url] = getMock.mock.calls[0] as [string]
  return url
}

function queryOf(url: string): URLSearchParams {
  return new URLSearchParams(url.slice(url.indexOf('?') + 1))
}

describe('jobsApi.get', () => {
  beforeEach(() => getMock.mockReset())

  it('GETs the single-job route', () => {
    getMock.mockResolvedValue({})
    jobsApi.get('job-1')
    expect(getMock).toHaveBeenCalledWith('/api/v1/jobs/job-1')
  })
})

describe('jobsApi.list (door 1)', () => {
  beforeEach(() => getMock.mockReset())

  it('sends the door defaults when called with no params', () => {
    getMock.mockResolvedValue({})
    jobsApi.list()
    expect(calledUrl()).toBe('/api/v1/jobs?limit=50&offset=0')
  })

  it('drops absent optional filters, keeps completed_after', () => {
    getMock.mockResolvedValue({})
    jobsApi.list({ completed_after: '2026-07-31T00:00:00.000Z' })
    const q = queryOf(calledUrl())
    expect(q.get('completed_after')).toBe('2026-07-31T00:00:00.000Z')
    expect(q.has('state_class')).toBe(false)
    expect(q.get('limit')).toBe('50')
    expect(q.get('offset')).toBe('0')
  })

  it('passes all four filters with the verbatim server names', () => {
    getMock.mockResolvedValue({})
    jobsApi.list({
      state_class: 'in_flight',
      completed_after: '2026-07-31T00:00:00.000Z',
      limit: 20,
      offset: 40,
    })
    const q = queryOf(calledUrl())
    expect(q.get('state_class')).toBe('in_flight')
    expect(q.get('completed_after')).toBe('2026-07-31T00:00:00.000Z')
    expect(q.get('limit')).toBe('20')
    expect(q.get('offset')).toBe('40')
  })
})

describe('jobsApi.list (door 1) — material_id filter (step Г c3)', () => {
  beforeEach(() => getMock.mockReset())

  it('includes material_id in the query when provided', () => {
    getMock.mockResolvedValue({})
    jobsApi.list({ material_id: 'mat-7', limit: 200 })
    const q = queryOf(calledUrl())
    expect(q.get('material_id')).toBe('mat-7')
    expect(q.get('limit')).toBe('200')
  })

  it('omits material_id when absent — no effect on a call that does not pass it', () => {
    getMock.mockResolvedValue({})
    jobsApi.list({ completed_after: '2026-07-31T00:00:00.000Z' })
    const q = queryOf(calledUrl())
    expect(q.has('material_id')).toBe(false)
    // strip-shape invariant preserved (limit/offset still the door defaults)
    expect(q.get('limit')).toBe('50')
    expect(q.get('offset')).toBe('0')
  })
})

describe('jobsApi.history (door 2)', () => {
  beforeEach(() => getMock.mockReset())

  it('GETs the history route with the caller-supplied page bounds', () => {
    getMock.mockResolvedValue({})
    jobsApi.history(25, 50)
    expect(calledUrl()).toBe('/api/v1/jobs/history?limit=25&offset=50')
  })

  it('bakes no size of its own — passes exactly what the call asks', () => {
    getMock.mockResolvedValue({})
    jobsApi.history(200, 0)
    const q = queryOf(calledUrl())
    expect(q.get('limit')).toBe('200')
    expect(q.get('offset')).toBe('0')
  })
})
