import { describe, it, expect } from 'vitest'
import { formatDuration } from './formatDuration'

const T0 = '2026-08-01T00:00:00Z'
const base = Date.parse(T0)
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// now = base + span → duration reads as `span`.
function after(span: number): number {
  return base + span
}

describe('formatDuration (Д4)', () => {
  it('null start (never picked up) → null — the caller shows words alone', () => {
    expect(formatDuration(null, after(5 * MIN))).toBeNull()
  })

  it('a negative span (clock skew, now before start) → null', () => {
    expect(formatDuration(T0, base - MIN)).toBeNull()
  })

  it('under a minute → "менше хвилини"', () => {
    expect(formatDuration(T0, after(30_000))).toBe('менше хвилини')
    expect(formatDuration(T0, after(0))).toBe('менше хвилини')
  })

  it('minutes only', () => {
    expect(formatDuration(T0, after(7 * MIN))).toBe('7 хв')
    expect(formatDuration(T0, after(59 * MIN))).toBe('59 хв')
  })

  it('two units: hours + minutes', () => {
    expect(formatDuration(T0, after(3 * HOUR + 20 * MIN))).toBe('3 год 20 хв')
  })

  it('drops a zero trailing unit ("3 год", not "3 год 0 хв")', () => {
    expect(formatDuration(T0, after(3 * HOUR))).toBe('3 год')
  })

  it('two units: days + hours, minutes dropped as the third unit', () => {
    expect(formatDuration(T0, after(2 * DAY + 5 * HOUR + 30 * MIN))).toBe('2 доби 5 год')
  })

  it('a zero second unit drops even with a non-zero third ("2 доби")', () => {
    expect(formatDuration(T0, after(2 * DAY + 30 * MIN))).toBe('2 доби')
  })

  it('survives tens of hours', () => {
    expect(formatDuration(T0, after(1 * DAY + 1 * HOUR))).toBe('1 доба 1 год')
  })

  it('доба plural: 1 доба / 2 доби / 5 діб, with the 11–14 exception', () => {
    expect(formatDuration(T0, after(1 * DAY))).toBe('1 доба')
    expect(formatDuration(T0, after(2 * DAY))).toBe('2 доби')
    expect(formatDuration(T0, after(5 * DAY))).toBe('5 діб')
    expect(formatDuration(T0, after(11 * DAY))).toBe('11 діб')
    expect(formatDuration(T0, after(21 * DAY))).toBe('21 доба')
    expect(formatDuration(T0, after(22 * DAY))).toBe('22 доби')
  })
})
