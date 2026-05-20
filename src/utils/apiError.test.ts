import { describe, it, expect } from 'vitest'
import { ApiError } from '../api/client'
import { rejectionDetail } from './apiError'

describe('rejectionDetail', () => {
  it('extracts inner details from a SECURITY_REJECTED-shape ApiError body', () => {
    const err = new ApiError(400, 'API error 400', {
      detail: {
        code: 'SECURITY_REJECTED',
        category: 'slide_count_limit',
        details: 'slide count 150 exceeds presentation limit 100',
      },
    })
    expect(rejectionDetail(err)).toBe('slide count 150 exceeds presentation limit 100')
  })

  it('returns null when ApiError body lacks detail.details', () => {
    expect(rejectionDetail(new ApiError(400, 'API error 400', { detail: { code: 'X' } }))).toBeNull()
  })

  it('returns null when detail is not an object', () => {
    expect(rejectionDetail(new ApiError(400, 'API error 400', { detail: 'plain' }))).toBeNull()
  })

  it('returns null for ApiError with null/undefined body', () => {
    expect(rejectionDetail(new ApiError(500, 'boom', null))).toBeNull()
    expect(rejectionDetail(new ApiError(500, 'boom'))).toBeNull()
  })

  it('returns null for non-ApiError input', () => {
    expect(rejectionDetail(new Error('plain'))).toBeNull()
    expect(rejectionDetail('string error')).toBeNull()
    expect(rejectionDetail(null)).toBeNull()
  })
})
