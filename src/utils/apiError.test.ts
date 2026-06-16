import { describe, it, expect } from 'vitest'
import { ApiError } from '../api/client'
import { rejectionDetail, validationMessage } from './apiError'

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

describe('validationMessage (FastAPI 422 — both runtime forms)', () => {
  it('returns the manual string detail as-is', () => {
    const err = new ApiError(422, 'API error 422', {
      detail: 'No editable fields supplied in PATCH body.',
    })
    expect(validationMessage(err)).toBe('No editable fields supplied in PATCH body.')
  })

  it('joins msgs from the pydantic array detail', () => {
    const err = new ApiError(422, 'API error 422', {
      detail: [
        { loc: ['body', 'bogus'], msg: 'Extra inputs are not permitted', type: 'extra_forbidden' },
        { loc: ['body', 'x'], msg: 'Field required', type: 'missing' },
      ],
    })
    expect(validationMessage(err)).toBe(
      'Extra inputs are not permitted; Field required',
    )
  })

  it('returns null for an empty array and for non-422 shapes', () => {
    expect(validationMessage(new ApiError(422, 'x', { detail: [] }))).toBeNull()
    expect(validationMessage(new ApiError(422, 'x', { detail: { reason: 'y' } }))).toBeNull()
    expect(validationMessage(new ApiError(422, 'x', null))).toBeNull()
    expect(validationMessage(new Error('plain'))).toBeNull()
  })
})
