import { describe, expect, it } from 'vitest'
import {
  flowError,
  PASSWORD_MIN_LENGTH,
  RESET_TOO_SHORT,
} from './recoveryTexts'

describe('recoveryTexts.flowError', () => {
  it('returns the mapped phrase for a known key', () => {
    expect(flowError('rateLimited')).toBe(
      'Забагато спроб. Спробуйте трохи згодом.',
    )
    expect(flowError('invalidToken')).toBe(
      'Посилання недійсне або протерміноване.',
    )
  })

  it('the weak-password phrase reuses the min-length constant', () => {
    expect(flowError('weakPassword')).toBe(RESET_TOO_SHORT)
    expect(RESET_TOO_SHORT).toContain(String(PASSWORD_MIN_LENGTH))
  })

  it('resolves the explicit network key (not via fallback)', () => {
    expect(flowError('network')).toBe('Не вдалося зʼєднатися із сервером.')
  })

  it('falls back to a generic network phrase for an unknown key', () => {
    expect(flowError('nope')).toBe('Не вдалося зʼєднатися із сервером.')
  })
})
