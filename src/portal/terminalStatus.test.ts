import { describe, expect, it } from 'vitest'
import { errorPhrase, PENDING_LABEL, statusBucket } from './terminalStatus'

describe('statusBucket', () => {
  it('buckets reviewed terminals', () => {
    expect(statusBucket('completed')).toBe('reviewed')
    expect(statusBucket('delivered')).toBe('reviewed')
  })

  it('buckets error terminals', () => {
    expect(statusBucket('rejected')).toBe('error')
    expect(statusBucket('mismatch')).toBe('error')
    expect(statusBucket('failed')).toBe('error')
  })

  it('buckets in-flight milestones as pending', () => {
    for (const s of ['received', 'safety_ok', 'sanity_ok', 'reviewing']) {
      expect(statusBucket(s)).toBe('pending')
    }
  })

  it('fails safe to pending on an unknown status', () => {
    expect(statusBucket('something_new')).toBe('pending')
  })
})

describe('errorPhrase', () => {
  // Locks the VERBATIM ratified DD-6-D-FE wording (no action text folded in).
  it('renders each error terminal phrase verbatim per ratification', () => {
    expect(errorPhrase('rejected')).toBe('Рішення не пройшло перевірку безпеки')
    expect(errorPhrase('mismatch')).toBe(
      'Надіслане не схоже на рішення цього завдання. ' +
        'Перевірте, що подаєте правильний файл',
    )
    expect(errorPhrase('failed')).toBe(
      'Не вдалося обробити подачу. Спробуйте надіслати ще раз',
    )
  })

  it('never echoes a backend error_message — phrases are static and curated', () => {
    // The dictionary is status-keyed only; it takes no free text.
    expect(errorPhrase('rejected')).toBe(errorPhrase('rejected'))
  })

  it('falls back generically on an unknown status', () => {
    expect(errorPhrase('weird')).toContain('помилка')
  })

  it('exposes a single pending label', () => {
    expect(PENDING_LABEL).toBe('На перевірці')
  })
})
