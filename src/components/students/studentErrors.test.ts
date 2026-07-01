import { describe, it, expect } from 'vitest'
import { ApiError } from '../../api/client'
import { studentErrorMessage } from './studentErrors'

// The author-facing error dictionary is load-bearing for the acceptance
// criteria (human 4xx messages, revoke wording). These lock the per-(action,
// status) mapping and the detail-based discriminators.
describe('studentErrorMessage', () => {
  it('splits provision 409 by credential vs login/external_id', () => {
    expect(
      studentErrorMessage(
        'provision',
        new ApiError(409, 'x', {
          detail: 'Student already has a portal credential.',
        }),
      ),
    ).toBe('Цей студент уже має доступ до порталу.')
    expect(
      studentErrorMessage(
        'provision',
        new ApiError(409, 'x', {
          detail: 'Login or external_id already in use.',
        }),
      ),
    ).toBe('Логін або external ID уже використовується.')
  })

  it('maps provision 422 (weak password) and 404', () => {
    expect(
      studentErrorMessage('provision', new ApiError(422, 'x', { detail: 'weak' })),
    ).toMatch(/пароль/i)
    expect(
      studentErrorMessage('provision', new ApiError(404, 'x', null)),
    ).toMatch(/не знайдено/i)
  })

  it('maps bind conflicts and non-root', () => {
    expect(
      studentErrorMessage('bind', new ApiError(409, 'x', null)),
    ).toMatch(/уже зарахований/i)
    expect(
      studentErrorMessage('bind', new ApiError(422, 'x', null)),
    ).toMatch(/кореневий/i)
  })

  it('maps unbind 404', () => {
    expect(
      studentErrorMessage('unbind', new ApiError(404, 'x', null)),
    ).toMatch(/зарахування не знайдено/i)
  })

  it('falls back for a non-ApiError', () => {
    expect(studentErrorMessage('revoke', new Error('boom'))).toMatch(
      /сервер/i,
    )
  })
})
