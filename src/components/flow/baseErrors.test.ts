import { describe, it, expect } from 'vitest'
import { ApiError } from '../../api/client'
import { baseErrorMessage } from './baseErrors'

// CRITICAL (P5-FE Commit #6 lesson): every fixture mirrors the REAL FastAPI
// wire-shape — the raised detail nests under ``detail`` as
// { detail: { code, details } }. A top-level { code } fixture would be a
// fiction that green-passes against the wrong reader.
const wire = (status: number, code: string, details = 'server msg') =>
  new ApiError(status, `API error ${status}`, { detail: { code, details } })

describe('baseErrorMessage — curated code phrases', () => {
  it('BASE_VERSION_CONFLICT (409) → concurrent-upload phrase', () => {
    expect(baseErrorMessage(wire(409, 'BASE_VERSION_CONFLICT'))).toContain(
      'завантажується',
    )
  })

  it('UPLOAD_TOO_LARGE (413) → size-limit phrase', () => {
    expect(baseErrorMessage(wire(413, 'UPLOAD_TOO_LARGE'))).toContain('100 МБ')
  })

  it('NOT_A_PROJECT_TASK (422) → project-only phrase', () => {
    expect(baseErrorMessage(wire(422, 'NOT_A_PROJECT_TASK'))).toContain(
      'Проєкт',
    )
  })

  it('NOT_AN_ARCHIVE (422) → archive-format phrase', () => {
    expect(baseErrorMessage(wire(422, 'NOT_AN_ARCHIVE'))).toContain('.zip')
  })
})

describe('baseErrorMessage — fallbacks', () => {
  it('unknown code → the raw server details (rejectionDetail)', () => {
    expect(
      baseErrorMessage(wire(400, 'SOME_NEW_CODE', 'a specific server reason')),
    ).toBe('a specific server reason')
  })

  it('native-422 array detail → joined validation msgs', () => {
    const err = new ApiError(422, 'API error 422', {
      detail: [{ loc: ['body', 'file'], msg: 'field required', type: 'x' }],
    })
    expect(baseErrorMessage(err)).toBe('field required')
  })

  it('native-422 string detail → returned as-is', () => {
    const err = new ApiError(422, 'API error 422', {
      detail: 'No file supplied',
    })
    expect(baseErrorMessage(err)).toBe('No file supplied')
  })

  it('non-ApiError → generic phrase', () => {
    expect(baseErrorMessage(new Error('network'))).toContain('Не вдалося')
  })

  it('GUARD: a top-level { code } body (the P5-FE bug shape) does NOT match', () => {
    // The reader must look at body.detail.code, not body.code. A body with the
    // code at the top level carries no nested detail → generic fallback, NOT a
    // curated phrase. This is what P5-FE Commit #6 got wrong.
    const bug = new ApiError(422, 'API error 422', { code: 'NOT_AN_ARCHIVE' })
    expect(baseErrorMessage(bug)).toContain('Не вдалося')
  })
})
