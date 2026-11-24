import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CriteriaOverrideRequest } from '../types/api'

const { getMock, putMock, deleteMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('./client', () => ({
  api: {
    get: getMock,
    put: putMock,
    delete: deleteMock,
  },
}))

import { criteriaApi, criteriaRefusal } from './criteria'

describe('criteriaApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls read with GET /api/v1/documents/{documentId}/criteria', async () => {
    criteriaApi.read('doc-123')
    expect(getMock).toHaveBeenCalledWith('/api/v1/documents/doc-123/criteria')
  })

  it('calls replace with PUT /api/v1/documents/{documentId}/criteria/override', async () => {
    const payload: CriteriaOverrideRequest = {
      criteria: [
        {
          id: 'c1',
          text: 'Does x',
          evidence: 'Returns y',
          weight: 'must',
          check_method: 'model_verdict',
          concepts: [],
          mandatory_points: [],
          must_by_author: true,
        },
      ],
    }
    criteriaApi.replace('doc-123', payload)
    expect(putMock).toHaveBeenCalledWith(
      '/api/v1/documents/doc-123/criteria/override',
      payload,
    )
  })

  it('calls reset with DELETE /api/v1/documents/{documentId}/criteria/override', async () => {
    criteriaApi.reset('doc-123')
    expect(deleteMock).toHaveBeenCalledWith(
      '/api/v1/documents/doc-123/criteria/override',
    )
  })
})

describe('criteriaRefusal', () => {
  it('parses a coded 422 refusal with detail: { code, details }', () => {
    const body = {
      detail: {
        code: 'MUST_BY_AUTHOR_WITHOUT_MUST',
        details: 'must_by_author: true on a criterion whose weight is not must',
      },
    }
    const parsed = criteriaRefusal(body)
    expect(parsed).toEqual({
      kind: 'coded',
      code: 'MUST_BY_AUTHOR_WITHOUT_MUST',
      details: 'must_by_author: true on a criterion whose weight is not must',
    })
  })

  it('parses other service refusal codes correctly', () => {
    const codes = [
      'NOT_A_TEXT_TASK',
      'TASK_NOT_READY',
      'AWAITING_FIRST_SUBMISSION',
      'UNKNOWN_CRITERION_ID',
      'CHECK_METHOD_NOT_ADMITTED',
      'UNKNOWN_CONCEPT',
    ]
    for (const code of codes) {
      const parsed = criteriaRefusal({
        detail: { code, details: `details for ${code}` },
      })
      expect(parsed).toEqual({
        kind: 'coded',
        code,
        details: `details for ${code}`,
      })
    }
  })

  it('parses a Pydantic validation error array 422 with { index, field } from loc', () => {
    const body = {
      detail: [
        {
          type: 'string_too_long',
          loc: ['body', 'criteria', 2, 'text'],
          msg: 'String should have at most 600 characters',
        },
        {
          type: 'value_error',
          loc: ['body', 'criteria', 0, 'check_method'],
          msg: "check_method 'mandatory_points' needs a non-empty mandatory_points list",
        },
      ],
    }
    const parsed = criteriaRefusal(body)
    expect(parsed).toEqual({
      kind: 'validation',
      errors: [
        {
          index: 2,
          field: 'text',
          loc: ['body', 'criteria', 2, 'text'],
          msg: 'String should have at most 600 characters',
          type: 'string_too_long',
        },
        {
          index: 0,
          field: 'check_method',
          loc: ['body', 'criteria', 0, 'check_method'],
          msg: "check_method 'mandatory_points' needs a non-empty mandatory_points list",
          type: 'value_error',
        },
      ],
    })
  })

  it('returns null for a 404 string detail', () => {
    expect(criteriaRefusal({ detail: 'Document not found' })).toBeNull()
  })

  it('returns null for 401, 403, null, undefined, or empty object bodies', () => {
    expect(criteriaRefusal({ detail: 'Not authenticated' })).toBeNull()
    expect(criteriaRefusal({ detail: 'Requires scope: prep' })).toBeNull()
    expect(criteriaRefusal(null)).toBeNull()
    expect(criteriaRefusal(undefined)).toBeNull()
    expect(criteriaRefusal({})).toBeNull()
    expect(criteriaRefusal({ detail: null })).toBeNull()
    expect(criteriaRefusal({ detail: [] })).toBeNull()
    expect(criteriaRefusal('raw string')).toBeNull()
  })
})
