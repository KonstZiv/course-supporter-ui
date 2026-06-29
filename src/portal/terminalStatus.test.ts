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
  it('gives a distinct curated phrase per error terminal', () => {
    expect(errorPhrase('rejected')).toContain('безпеки')
    expect(errorPhrase('mismatch')).toContain('не схоже')
    expect(errorPhrase('failed')).toContain('Не вдалося обробити')
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
