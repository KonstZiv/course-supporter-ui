import { describe, expect, it } from 'vitest'
import {
  availableLine,
  ceilingEnough,
  ceilingShort,
  costOverReserve,
  COUNTING,
  expiringReminder,
  FILE_WAITS_HERE,
  FREE_REVIEW,
  lowReminder,
  NEXT_MAY_FAIL,
  PAID_BY_AUTHOR,
  PRICE_UNAVAILABLE,
  pricedEnough,
  pricedShort,
  reviewsLeftLine,
  TEST_NEEDS_PACKAGE,
  UNITS_NOW_ENOUGH,
  BUY_UNITS,
} from './unitsTexts'

// The portal's product files, not its tests: a test may name a word to say it
// must not appear.
const sources = import.meta.glob<string>(
  ['/src/portal/**/*.{ts,tsx}', '!/src/portal/**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
)

// Built from parts, so this file holds no copy of the word it looks for.
const TEACHER = ['викла', 'дач'].join('')

describe('the portal names the author of the course, never a teacher (5.6)', () => {
  it('no product file of the portal has the word', () => {
    const files = Object.keys(sources)
    expect(files.length).toBeGreaterThan(50)
    const found = files.filter((file) => sources[file]!.toLowerCase().includes(TEACHER))
    expect(found).toEqual([])
  })
})

// Every sentence of stage 2b, with numbers in it where it takes them.
const SENTENCES = [
  PAID_BY_AUTHOR,
  COUNTING,
  PRICE_UNAVAILABLE,
  FREE_REVIEW,
  UNITS_NOW_ENOUGH,
  BUY_UNITS,
  FILE_WAITS_HERE,
  TEST_NEEDS_PACKAGE,
  NEXT_MAY_FAIL,
  ceilingEnough(40, 50),
  ceilingShort(40, 3, 2),
  pricedEnough(5, 20),
  pricedShort(12, 5, 7),
  reviewsLeftLine(8),
  availableLine(120, 8),
  availableLine(120, null),
  lowReminder(2),
  expiringReminder(500, '2026-12-01'),
  costOverReserve(5, 2),
]

describe('the words of stage 2b keep the language rules', () => {
  it.each(SENTENCES)('«%s»', (sentence) => {
    // «кошти» the noun, not «коштує» the verb every price sentence needs.
    expect(sentence).not.toMatch(
      /баланс|рахун|поповн|кошти|коштів|кредит|різниц|борг|напишіть нам|creem|paddle|stripe/i,
    )
    expect(sentence).not.toMatch(new RegExp(TEACHER, 'i'))
  })

  it('the price words never speak of a test payment', () => {
    for (const s of SENTENCES.filter((x) => x !== TEST_NEEDS_PACKAGE)) {
      expect(s).not.toMatch(/тест/i)
    }
  })
})
