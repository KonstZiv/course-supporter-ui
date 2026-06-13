import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the fetch wrapper to break the transitive auth-store import and to
// assert the call shape (project convention — no msw).
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))
vi.mock('./client', () => ({ api: { post: postMock } }))

import {
  summaryApi,
  isUncoveredStaleNodes,
  uncoveredStaleDetail,
} from './node-summary'

describe('summaryApi.generate', () => {
  beforeEach(() => postMock.mockReset())

  it('POSTs to the generate endpoint with force=false by default', () => {
    postMock.mockResolvedValue({})
    summaryApi.generate('node-7')
    expect(postMock).toHaveBeenCalledWith(
      '/api/v1/nodes/node-7/summary/generate',
      { force: false },
    )
  })

  it('passes force=true through', () => {
    postMock.mockResolvedValue({})
    summaryApi.generate('node-7', true)
    expect(postMock).toHaveBeenCalledWith(
      '/api/v1/nodes/node-7/summary/generate',
      { force: true },
    )
  })
})

describe('isUncoveredStaleNodes', () => {
  it('matches the EXACT uncovered_stale_nodes reason', () => {
    expect(
      isUncoveredStaleNodes({
        reason: 'uncovered_stale_nodes',
        uncovered_stale_node_ids: ['a'],
        hint: 'h',
      }),
    ).toBe(true)
  })

  it('rejects not_yet_generated — sibling route must NOT trigger the branch', () => {
    expect(isUncoveredStaleNodes({ reason: 'not_yet_generated' })).toBe(false)
  })

  it('rejects null, non-object, and missing reason', () => {
    expect(isUncoveredStaleNodes(null)).toBe(false)
    expect(isUncoveredStaleNodes('uncovered_stale_nodes')).toBe(false)
    expect(isUncoveredStaleNodes({})).toBe(false)
    expect(isUncoveredStaleNodes({ reason: 42 })).toBe(false)
  })
})

// Regression (live-§2 fix, c5): these assert against the REAL wire body —
// FastAPI wraps the detail under a top-level ``detail`` key, which is what
// ``ApiError.body`` carries. The earlier guard tests fed the inner object and
// missed the envelope.
describe('uncoveredStaleDetail (unwraps the FastAPI envelope)', () => {
  it('extracts the inner detail from the wrapped body', () => {
    const body = {
      detail: {
        reason: 'uncovered_stale_nodes',
        uncovered_stale_node_ids: ['node-a', 'node-b'],
        hint: 'h',
      },
    }
    const detail = uncoveredStaleDetail(body)
    expect(detail).not.toBeNull()
    expect(detail?.uncovered_stale_node_ids).toEqual(['node-a', 'node-b'])
  })

  it('returns null for the wrapped not_yet_generated sibling reason', () => {
    expect(
      uncoveredStaleDetail({ detail: { reason: 'not_yet_generated' } }),
    ).toBeNull()
  })

  it('returns null for an unwrapped (envelope-less) body — guards the bug', () => {
    // The exact shape the buggy c4 code assumed: reason at top level, no
    // ``detail`` wrapper. Must NOT match.
    expect(
      uncoveredStaleDetail({
        reason: 'uncovered_stale_nodes',
        uncovered_stale_node_ids: [],
        hint: 'h',
      }),
    ).toBeNull()
  })

  it('returns null for null / non-object / empty', () => {
    expect(uncoveredStaleDetail(null)).toBeNull()
    expect(uncoveredStaleDetail('x')).toBeNull()
    expect(uncoveredStaleDetail({})).toBeNull()
    expect(uncoveredStaleDetail({ detail: null })).toBeNull()
  })
})
