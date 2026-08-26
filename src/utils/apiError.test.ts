import { describe, it, expect } from 'vitest'
import { ApiError } from '../api/client'
import {
  authoredRejectionMessage,
  rejectionDetail,
  validationMessage,
} from './apiError'
import { ingestErrorMessage } from './ingestErrors'

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

describe('authoredRejectionMessage', () => {
  const security = (category: string) =>
    new ApiError(400, 'x', {
      detail: {
        code: 'SECURITY_REJECTED',
        category,
        details: 'raw stage-1 text',
      },
    })

  it('maps a SECURITY_REJECTED to the human dictionary by category', () => {
    expect(authoredRejectionMessage(security('suspicious_unicode'))).toBe(
      ingestErrorMessage('suspicious_unicode'),
    )
  })

  it('degrades an unknown security category to the generic phrase, never raw', () => {
    const msg = authoredRejectionMessage(security('brand_new_category'))
    expect(msg).toBe(ingestErrorMessage(null))
    expect(msg).not.toContain('raw stage-1 text')
  })

  it('passes an INTAKE_* product-language details through verbatim', () => {
    const err = new ApiError(400, 'x', {
      detail: {
        code: 'INTAKE_DURATION_EXCEEDED',
        category: 'duration_limit',
        details:
          'Система обробляє відео тривалістю до 150 хвилин; це відео — 180 хв.',
      },
    })
    expect(authoredRejectionMessage(err)).toBe(
      'Система обробляє відео тривалістю до 150 хвилин; це відео — 180 хв.',
    )
  })

  it('degrades an unfamiliar recognised code to the generic phrase, never raw', () => {
    const err = new ApiError(422, 'x', {
      detail: {
        code: 'ARCHIVE_REQUIRES_CODE',
        details: 'archive uploads are accepted only as source_type=code',
      },
    })
    const msg = authoredRejectionMessage(err)
    expect(msg).toBe(ingestErrorMessage(null))
    expect(msg).not.toContain('archive uploads')
  })

  it('returns null for a code-less envelope (the caller fallback takes over)', () => {
    expect(
      authoredRejectionMessage(
        new ApiError(400, 'x', { detail: { details: 'x' } }),
      ),
    ).toBeNull()
  })

  it('returns null for non-server errors', () => {
    expect(authoredRejectionMessage(new ApiError(500, 'x', null))).toBeNull()
    expect(authoredRejectionMessage(new Error('net'))).toBeNull()
    expect(authoredRejectionMessage(null)).toBeNull()
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
