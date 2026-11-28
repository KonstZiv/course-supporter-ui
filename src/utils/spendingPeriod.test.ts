import { describe, expect, it } from 'vitest'
import { monthLabel } from './spendingPeriod'

describe('monthLabel', () => {
  it.each([
    [{ year: 2026, month: 10 }, 'uk', 'листопад 2026'],
    [{ year: 2026, month: 10 }, 'en', 'November 2026'],
    [{ year: 2026, month: 0 }, 'uk', 'січень 2026'],
    [{ year: 2026, month: 0 }, 'en', 'January 2026'],
  ] as const)('%o in %s → %s', (month, language, expected) => {
    expect(monthLabel(month, language)).toBe(expected)
  })
})
