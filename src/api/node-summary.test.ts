import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the fetch wrapper to break the transitive auth-store import and to
// assert the call shape (project convention — no msw).
const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))
vi.mock('./client', () => ({ api: { post: postMock } }))

import { summaryApi, isUncoveredStaleNodes } from './node-summary'

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
