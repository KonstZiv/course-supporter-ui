import { describe, expect, it } from 'vitest'
import { translate } from '../i18n/translate'
import {
  availableLine,
  ceilingEnough,
  ceilingShort,
  costOverReserve,
  expiringReminder,
  lowReminder,
  pricedEnough,
  pricedShort,
  reviewsLeftLine,
} from './unitsTexts'

const PAID_BY_AUTHOR = translate('uk', 'portal.units.paidByAuthor')
const COUNTING = translate('uk', 'portal.units.counting')
const PRICE_UNAVAILABLE = translate('uk', 'portal.units.priceUnavailable')
const FREE_REVIEW = translate('uk', 'portal.units.freeReview')
const UNITS_NOW_ENOUGH = translate('uk', 'portal.units.nowEnough')
const BUY_UNITS = translate('uk', 'portal.units.buy')
const FILE_WAITS_HERE = translate('uk', 'portal.units.fileWaitsHere')
const TEST_NEEDS_PACKAGE = translate('uk', 'portal.units.testNeedsPackage')
const NEXT_MAY_FAIL = translate('uk', 'portal.units.nextMayFail')

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
  ceilingEnough('uk', 40, 50),
  ceilingShort('uk', 40, 3, 2),
  pricedEnough('uk', 5, 20),
  pricedShort('uk', 12, 5, 7),
  reviewsLeftLine('uk', 8),
  availableLine('uk', 120, 8),
  availableLine('uk', 120, null),
  lowReminder('uk', 2),
  expiringReminder('uk', 500, '2026-12-01'),
  costOverReserve('uk', 5, 2),
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
