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
  zeroUnitsReminder,
} from './unitsTexts'
import type { PortalPublicNumbers } from './types'

const PAID_BY_AUTHOR = translate('uk', 'portal.units.paidByAuthor')
const COUNTING = translate('uk', 'portal.units.counting')
const PRICE_UNAVAILABLE = translate('uk', 'portal.units.priceUnavailable')
const FREE_REVIEW = translate('uk', 'portal.units.freeReview')
const UNITS_NOW_ENOUGH = translate('uk', 'portal.units.nowEnough')
const BUY_UNITS = translate('uk', 'portal.units.buy')
const FILE_WAITS_HERE = translate('uk', 'portal.units.fileWaitsHere')
const TEST_NEEDS_PACKAGE = translate('uk', 'portal.units.testNeedsPackage')
const NEXT_MAY_FAIL = translate('uk', 'portal.units.nextMayFail')

const SAMPLE_NUMBERS: PortalPublicNumbers = {
  contract_version: 1,
  packages: [
    { id: 'units-500-v1', units: 500, price_minor: 999, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
  ],
  review_cost: {
    homework: {
      status: 'ready',
      actual: { min: 44, typical: 72, max: 163 },
      smallest_package_reviews: { low: 2, typical: 4, high: 7 },
    },
  },
}

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
  availableLine('uk', 120, 0),
  availableLine('uk', 120, null),
  lowReminder('uk', 2),
  expiringReminder('uk', 500, '2026-12-01'),
  costOverReserve('uk', 5, 2),
  zeroUnitsReminder('uk', SAMPLE_NUMBERS),
  zeroUnitsReminder('uk', null),
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

  it('availableLine with 0 reviews left shows only available units', () => {
    expect(availableLine('uk', 120, 0)).toBe('Доступно 120 юнітів.')
  })

  it('zeroUnitsReminder formats sample numbers verbatim in uk and en', () => {
    expect(zeroUnitsReminder('uk', SAMPLE_NUMBERS)).toBe(
      'Перевірки робіт платні. Одна перевірка зазвичай коштує 72 юніти (від 44 до 163; перевірка проєкту — дорожче). Найменшого пакета (500 юнітів) вистачає приблизно на 2–7 перевірок.',
    )
    expect(zeroUnitsReminder('en', SAMPLE_NUMBERS)).toBe(
      'Reviews of your work are paid. One review usually costs 72 units (from 44 to 163; a project review costs more). The smallest package (500 units) covers about 2–7 reviews.',
    )
    expect(zeroUnitsReminder('uk', null)).toBe('Перевірки робіт оплачуються юнітами.')
    expect(zeroUnitsReminder('en', null)).toBe('Reviews of your work are paid for in units.')
  })

  it('zeroUnitsReminder picks the smallest package by units regardless of array order and uses ICU plural for high', () => {
    const unordered: PortalPublicNumbers = {
      ...SAMPLE_NUMBERS,
      packages: [
        { id: 'big', units: 5000, price_minor: 3999, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
        { id: 'small', units: 500, price_minor: 999, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
      ],
      review_cost: {
        homework: {
          status: 'ready',
          actual: { min: 44, typical: 72, max: 163 },
          smallest_package_reviews: { low: 1, typical: 1, high: 1 },
        },
      },
    }
    expect(zeroUnitsReminder('uk', unordered)).toContain('(500 юнітів) вистачає приблизно на 1–1 перевірку.')
    expect(zeroUnitsReminder('en', unordered)).toContain('(500 units) covers about 1–1 review.')
  })
})
