import { describe, expect, it } from 'vitest'
import { translate } from '../i18n/translate'
import { flowError, PASSWORD_MIN_LENGTH } from './recoveryTexts'

const RESET_TOO_SHORT = translate('uk', 'portal.recovery.reset.tooShort', {
  min: PASSWORD_MIN_LENGTH,
})

describe('recoveryTexts.flowError', () => {
  it('returns the mapped phrase for a known key', () => {
    expect(flowError('uk', 'rateLimited')).toBe(
      'Забагато спроб. Спробуйте трохи згодом.',
    )
    expect(flowError('uk', 'invalidToken')).toBe(
      'Посилання недійсне або протерміноване.',
    )
  })

  it('the weak-password phrase reuses the min-length constant', () => {
    expect(flowError('uk', 'weakPassword')).toBe(RESET_TOO_SHORT)
    expect(RESET_TOO_SHORT).toContain(String(PASSWORD_MIN_LENGTH))
  })

  it('resolves the explicit network key (not via fallback)', () => {
    expect(flowError('uk', 'network')).toBe('Не вдалося зʼєднатися із сервером.')
  })

  it('falls back to a generic network phrase for an unknown key', () => {
    expect(flowError('uk', 'nope')).toBe('Не вдалося зʼєднатися із сервером.')
  })
})
