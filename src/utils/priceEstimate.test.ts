import { describe, expect, it } from 'vitest'
import type { AuthorEstimateResponse } from '../types/api'
import {
  batchPriceView,
  isMaterialEstimateKind,
  priceEnoughText,
  priceShortText,
  priceViewOf,
  unpricedFilesText,
  type EstimateOutcome,
} from './priceEstimate'

const NB = ' '

function answer(over: Partial<AuthorEstimateResponse> = {}): AuthorEstimateResponse {
  return {
    price_units: 120,
    available_units: 1500,
    enough: true,
    missing_units: null,
    charging_enabled: true,
    unpriced_reason: null,
    missing_features: null,
    ...over,
  }
}
const answered = (a: AuthorEstimateResponse): EstimateOutcome => ({
  status: 'answered',
  answer: a,
})
const priced = (over: Partial<AuthorEstimateResponse> = {}): EstimateOutcome =>
  answered(answer(over))
/** The server's answer without a price: the request lacks a feature. */
const unpriced = (over: Partial<AuthorEstimateResponse> = {}): EstimateOutcome =>
  answered(
    answer({
      price_units: null,
      missing_units: null,
      unpriced_reason: 'missing_features',
      missing_features: ['text_chars'],
      ...over,
    }),
  )
/** The server's answer without a price: the estimate itself failed. */
const estimateFailed = (over: Partial<AuthorEstimateResponse> = {}): EstimateOutcome =>
  answered(
    answer({ price_units: null, missing_units: null, unpriced_reason: 'estimate_failed', ...over }),
  )
const FAILED: EstimateOutcome = { status: 'failed' }

describe('isMaterialEstimateKind — the kinds the estimate accepts', () => {
  it('the six kinds of ProcessingEstimateRequest, nothing else', () => {
    for (const kind of ['text', 'web', 'code', 'audio', 'video', 'presentation']) {
      expect(isMaterialEstimateKind(kind)).toBe(true)
    }
    for (const other of ['test', 'archive', '', 'toString', 'constructor']) {
      expect(isMaterialEstimateKind(other)).toBe(false)
    }
  })
})

describe('priceViewOf — the five rows of a single action', () => {
  it('1: charging off → nothing, even without the features', () => {
    expect(priceViewOf(priced({ charging_enabled: false }))).toEqual({ kind: 'none' })
    expect(priceViewOf(unpriced({ charging_enabled: false }))).toEqual({ kind: 'none' })
  })

  it('2: the request failed', () => {
    expect(priceViewOf(FAILED)).toEqual({ kind: 'failed' })
  })

  it('3: charging on, features not sent → unpriced; the price is neither shown nor compared', () => {
    expect(priceViewOf(unpriced({ enough: false, missing_units: 5 }))).toEqual({
      kind: 'unpriced',
      batch: false,
    })
  })

  it('4: enough → the price and what is available', () => {
    expect(priceViewOf(priced())).toEqual({ kind: 'enough', price: 120, available: 1500 })
  })

  it('5: not enough → price, available, missing', () => {
    expect(
      priceViewOf(priced({ enough: false, available_units: 40, missing_units: 80 })),
    ).toEqual({ kind: 'short', price: 120, available: 40, missing: 80 })
  })

  it('the estimate itself failed → as a failed request, never a price of 0', () => {
    expect(priceViewOf(estimateFailed())).toEqual({ kind: 'failed' })
    expect(priceViewOf(estimateFailed({ charging_enabled: false }))).toEqual({ kind: 'none' })
  })

  it('a price of 0 with no reason is free → nothing', () => {
    expect(priceViewOf(priced({ price_units: 0 }))).toEqual({ kind: 'none' })
  })
})

describe('batchPriceView — a batch of files', () => {
  it('nothing paid in it → nothing', () => {
    expect(batchPriceView([])).toEqual({ kind: 'none' })
  })

  it('the sum of the prices, and what is available', () => {
    expect(batchPriceView([priced(), priced({ price_units: 30 })])).toEqual({
      kind: 'enough',
      price: 150,
      available: 1500,
    })
  })

  it('some files unpriced: the sum of the others, and how many are left out', () => {
    expect(batchPriceView([priced(), unpriced(), FAILED])).toEqual({
      kind: 'enough',
      price: 120,
      available: 1500,
      unpriced: { count: 2, of: 3 },
    })
  })

  it('a file whose estimate failed is left out like an unpriced one', () => {
    expect(
      batchPriceView([estimateFailed(), priced(), priced({ price_units: 30 })]),
    ).toEqual({
      kind: 'enough',
      price: 150,
      available: 1500,
      unpriced: { count: 1, of: 3 },
    })
  })

  it('every file unpriced → the batch line', () => {
    expect(batchPriceView([unpriced(), unpriced()])).toEqual({
      kind: 'unpriced',
      batch: true,
    })
    expect(batchPriceView([estimateFailed(), unpriced(), FAILED])).toEqual({
      kind: 'unpriced',
      batch: true,
    })
  })

  it('every file free → nothing; free beside unpriced → the files left out', () => {
    expect(
      batchPriceView([priced({ price_units: 0 }), priced({ price_units: 0 })]),
    ).toEqual({ kind: 'none' })
    expect(batchPriceView([priced({ price_units: 0 }), unpriced()])).toEqual({
      kind: 'enough',
      price: 0,
      available: 1500,
      unpriced: { count: 1, of: 2 },
    })
  })

  it('every request failed → failed', () => {
    expect(batchPriceView([FAILED, FAILED])).toEqual({ kind: 'failed' })
  })

  it('one file short → the batch is short, by the sum', () => {
    expect(
      batchPriceView([
        priced({ price_units: 100, available_units: 150 }),
        priced({ price_units: 200, available_units: 150, enough: false, missing_units: 50 }),
      ]),
    ).toEqual({ kind: 'short', price: 300, available: 150, missing: 150 })
  })

  it('each file fits, the sum does not → it starts, with the warning', () => {
    expect(
      batchPriceView([
        priced({ price_units: 100, available_units: 150 }),
        priced({ price_units: 100, available_units: 150 }),
      ]),
    ).toEqual({ kind: 'enough', price: 200, available: 150, mayFallShort: true })
  })

  it('a single file over what is available but enough (credit) → no warning', () => {
    expect(batchPriceView([priced({ price_units: 200, available_units: 150 })])).toEqual({
      kind: 'enough',
      price: 200,
      available: 150,
    })
  })

  it('charging off in the answers → nothing', () => {
    expect(
      batchPriceView([priced({ charging_enabled: false }), FAILED]),
    ).toEqual({ kind: 'none' })
  })
})

describe('the words', () => {
  it('row 4', () => {
    expect(priceEnoughText('uk', 1200, 1500)).toBe(
      `Орієнтовна вартість: приблизно 1${NB}200 юнітів. У вас доступно 1${NB}500 юнітів.`,
    )
  })

  it('row 5', () => {
    expect(priceShortText('uk', 120, 40, 80)).toBe(
      'Ця дія коштує приблизно 120 юнітів, у вас 40 юнітів. Не вистачає 80 юнітів.',
    )
  })

  it('files left out of a batch: "файл" after the number', () => {
    expect(unpricedFilesText('uk', 1, 3)).toBe('Для 1 з 3 файлів порахувати до обробки не вдалося.')
    expect(unpricedFilesText('uk', 2, 5)).toBe('Для 2 з 5 файлів порахувати до обробки не вдалося.')
    expect(unpricedFilesText('uk', 1, 21)).toBe('Для 1 з 21 файла порахувати до обробки не вдалося.')
  })
})
