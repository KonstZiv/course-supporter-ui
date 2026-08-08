import { describe, it, expect } from 'vitest'
import { formatDateTime } from './dateTime'

describe('formatDateTime — absolute moment in the product language', () => {
  // Midday UTC → the same calendar day in UTC and in Kyiv, so the month word is
  // stable regardless of the runner's zone; the exact hour is zone-dependent by
  // design (the author sees local time), so it is matched by shape, not value.
  const AUG = '2026-08-08T12:00:00Z'

  it('renders "day month(long) year, HH:MM" — no locale "р." / "о HH:MM"', () => {
    const out = formatDateTime(AUG)
    expect(out).toMatch(/^\d{1,2} \S+ \d{4}, \d{2}:\d{2}$/u)
    expect(out).toContain('серпня') // long genitive month
    expect(out).not.toContain('р.') // manual composition drops the locale year mark
    expect(out).not.toContain(' о ') // ...and the "о HH:MM" literal
  })

  it('carries no machine time format (no seconds, no ISO, no dashed date)', () => {
    const out = formatDateTime(AUG)
    expect(out).not.toMatch(/:\d{2}:\d{2}/) // seconds
    expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}/) // dashed machine date
    expect(out).not.toMatch(/T\d{2}/) // ISO 'T'
  })
})
