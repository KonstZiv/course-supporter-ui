import { describe, it, expect } from 'vitest'
import { relativeTime } from './relativeTime'

const NOW = Date.parse('2026-08-07T12:00:00Z')
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString()
}

describe('relativeTime', () => {
  it('renders "щойно" under a minute', () => {
    expect(relativeTime(ago(10_000), NOW)).toBe('щойно')
  })

  it('renders Ukrainian minute plurals', () => {
    expect(relativeTime(ago(5 * MIN), NOW)).toContain('хвилин')
  })

  it('renders hours within a day', () => {
    expect(relativeTime(ago(3 * HOUR), NOW)).toContain('годин')
  })

  it('renders the day-ago word (numeric: auto — ICU spells it "учора")', () => {
    // Assert the stem, not the exact у/в spelling: CLDR uses "учора", and the
    // variant can shift with the ICU version. Both are correct Ukrainian.
    expect(relativeTime(ago(1 * DAY), NOW)).toMatch(/чора/)
  })

  it('renders days beyond that', () => {
    expect(relativeTime(ago(4 * DAY), NOW)).toContain('дн')
  })
})
