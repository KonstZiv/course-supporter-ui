import { describe, expect, it, vi, beforeEach } from 'vitest'

// The fetch wrapper is mocked to assert the call shape (project convention —
// no msw); ApiError stays the real class, for billingReason.
const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))
vi.mock('./client', async (importOriginal) => {
  const real = await importOriginal<typeof import('./client')>()
  return { ...real, api: { get: getMock, post: postMock } }
})

import { ApiError } from './client'
import {
  billingReason,
  getBalance,
  getCheckout,
  getPackages,
  getStatement,
  getTerms,
  postCheckout,
  postConsent,
  estimateNodeSummary,
} from './billing'

describe('billing requests', () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({})
    postMock.mockReset().mockResolvedValue({})
  })

  it('reads terms, packages and balance', () => {
    void getTerms()
    void getPackages()
    void getBalance()
    expect(getMock.mock.calls).toEqual([
      ['/api/v1/billing/terms'],
      ['/api/v1/billing/packages'],
      ['/api/v1/billing/balance'],
    ])
  })

  it('sends the consent with the revision and the fingerprint', () => {
    void postConsent('2026-11-12', 'ab'.repeat(32))
    expect(postMock).toHaveBeenCalledWith('/api/v1/billing/consent', {
      terms_version: '2026-11-12',
      text_sha256: 'ab'.repeat(32),
    })
  })

  it('opens a checkout with the package only — no provider', () => {
    void postCheckout('units-500')
    expect(postMock).toHaveBeenCalledWith('/api/v1/billing/checkout', {
      package_id: 'units-500',
    })
  })

  it('asks a checkout state by its number, encoded', () => {
    void getCheckout('a/b c')
    expect(getMock).toHaveBeenCalledWith('/api/v1/billing/checkouts/a%2Fb%20c')
  })

  it('reads the statement 50 lines a page, with the cursor when there is one', () => {
    void getStatement()
    void getStatement('next 1')
    expect(getMock.mock.calls).toEqual([
      ['/api/v1/billing/statement?limit=50'],
      ['/api/v1/billing/statement?limit=50&cursor=next+1'],
    ])
  })

  it('estimates node summary regeneration with force in the body', () => {
    void estimateNodeSummary('node-123', false)
    void estimateNodeSummary('node-456', true)
    expect(postMock.mock.calls).toEqual([
      ['/api/v1/nodes/node-123/summary/estimate', { force: false }],
      ['/api/v1/nodes/node-456/summary/estimate', { force: true }],
    ])
  })
})

describe('billingReason', () => {
  it('reads detail.code of a coded refusal', () => {
    const err = new ApiError(409, 'API error 409', {
      detail: { code: 'terms_changed', details: 'The billing terms changed.' },
    })
    expect(billingReason(err)).toBe('terms_changed')
  })

  it('is null for anything else', () => {
    expect(billingReason(new TypeError('Failed to fetch'))).toBeNull()
    expect(billingReason(new ApiError(500, 'API error 500', null))).toBeNull()
    expect(
      billingReason(new ApiError(404, 'API error 404', { detail: 'Not Found' })),
    ).toBeNull()
  })
})
