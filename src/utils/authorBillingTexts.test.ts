import { describe, expect, it } from 'vitest'
import type { BillingOutlookResponse } from '../types/api'
import { expiringText, heldReviewsWords, runsOutText } from './authorBillingTexts'

const NB = ' '

const QUIET: BillingOutlookResponse = {
  days_left: null,
  warning: null,
  expiring_soon: null,
  held_reviews: { count: 0, oldest_at: null, missing_units: 0 },
}

describe('runsOutText (5.1)', () => {
  it('the warning with a number of days', () => {
    expect(runsOutText({ ...QUIET, warning: 'runs_out_soon', days_left: 5 })).toBe(
      'За вашого темпу юнітів вистачить приблизно на 5 днів.',
    )
    expect(runsOutText({ ...QUIET, warning: 'runs_out_soon', days_left: 1 })).toBe(
      'За вашого темпу юнітів вистачить приблизно на 1 день.',
    )
  })

  it('nothing without the warning, or without the days', () => {
    expect(runsOutText({ ...QUIET, days_left: 3 })).toBeNull()
    expect(runsOutText({ ...QUIET, warning: 'runs_out_soon', days_left: null })).toBeNull()
  })
})

describe('expiringText (5.1)', () => {
  it('the units and the day they burn', () => {
    expect(expiringText({ units: 1500, expires_on: '2026-12-01' })).toBe(
      `1${NB}500 юнітів згорить 1 грудня 2026: тоді закінчується строк пакета.`,
    )
  })
})

describe('heldReviewsWords (5.4)', () => {
  it('waiting, units missing: the count, what is missing, and the purchase', () => {
    expect(
      heldReviewsWords({ count: 3, oldest_at: '2026-11-14T10:00:00Z', missing_units: 240 }),
    ).toEqual({
      text:
        'Перевірки робіт ваших студентів чекають юнітів: 3 роботи. ' +
        'Щоб вони почалися, потрібно ще 240 юнітів.',
      buy: true,
    })
  })

  it('waiting, nothing missing: they start soon, no purchase', () => {
    expect(
      heldReviewsWords({ count: 1, oldest_at: '2026-11-14T10:00:00Z', missing_units: 0 }),
    ).toEqual({
      text: 'Юнітів уже вистачає: перевірки робіт ваших студентів (1 робота) почнуться найближчим часом.',
      buy: false,
    })
  })

  it('none waiting: no banner', () => {
    expect(heldReviewsWords({ count: 0, oldest_at: null, missing_units: 0 })).toBeNull()
  })
})
