import type { AuthorEstimateResponse, MaterialEstimateKind } from '../types/api'
import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'
import { formatUnits } from './units'

// The price before an author's paid action (BIL-E): what an estimate answer
// means on the screen. A pure module — the view and its words; the requests
// are the caller's. Whether there is a price is the server's answer alone
// (`price_units` null); the features a kind needs are the server's to know.

/** The kinds of material the processing estimate accepts; held to the type. */
const ESTIMATE_KINDS: Readonly<Record<MaterialEstimateKind, true>> = {
  text: true,
  web: true,
  code: true,
  audio: true,
  video: true,
  presentation: true,
}

/** Whether a source type is a kind the processing estimate accepts. */
export function isMaterialEstimateKind(type: string): type is MaterialEstimateKind {
  return Object.prototype.hasOwnProperty.call(ESTIMATE_KINDS, type)
}

/** One estimate as it came back. */
export type EstimateOutcome =
  | { status: 'failed' }
  | { status: 'answered'; answer: AuthorEstimateResponse }

type PricedAnswer = AuthorEstimateResponse & { price_units: number }

const hasPrice = (answer: AuthorEstimateResponse): answer is PricedAnswer =>
  answer.price_units !== null

/** What the price card shows. P = price, A = available, M = missing. */
export type PriceView =
  | { kind: 'pending' }
  /** Charging is off, nothing in the action is paid, or it is free: nothing shown. */
  | { kind: 'none' }
  /** The request failed (network, 5xx), or the estimate of a single action did. */
  | { kind: 'failed' }
  /** No price before processing: for the material, or for any file of a batch. */
  | { kind: 'unpriced'; batch: boolean }
  | {
      kind: 'enough'
      price: number
      available: number | null
      /** Files of a batch the price leaves out (no price, or the request failed). */
      unpriced?: { count: number; of: number }
      /** A batch dearer than what is available, though each file fits. */
      mayFallShort?: boolean
    }
  | { kind: 'short'; price: number; available: number; missing: number }

/** The view of a single action's estimate. */
export function priceViewOf(outcome: EstimateOutcome): PriceView {
  return batchPriceView([outcome])
}

/**
 * The view of the estimates of one action: a single one, or one per file of a
 * batch. Charging off → nothing; any file short → the batch does not start;
 * every file fits but together they cost more than what is available → a
 * warning, and the batch starts (an author with credit is never stopped, and
 * the sum cannot tell them apart); the whole action free → nothing.
 */
export function batchPriceView(outcomes: readonly EstimateOutcome[]): PriceView {
  if (outcomes.length === 0) return { kind: 'none' }
  const answers = outcomes.flatMap((o) => (o.status === 'answered' ? [o.answer] : []))
  if (answers.length === 0) return { kind: 'failed' }
  if (answers.some((a) => !a.charging_enabled)) return { kind: 'none' }

  const priced = answers.filter(hasPrice)
  const batch = outcomes.length > 1
  if (priced.length === 0) {
    // A single action: a failed estimate reads as a failed request. A batch
    // counts every file without a price, failed requests too, as unpriced.
    const failed = !batch && answers[0]!.unpriced_reason !== 'missing_features'
    return failed ? { kind: 'failed' } : { kind: 'unpriced', batch }
  }

  const price = priced.reduce((sum, a) => sum + a.price_units, 0)
  const available = priced.map((a) => a.available_units).find((a) => a !== null) ?? null
  const short = priced.filter((a) => !a.enough)
  if (short.length > 0) {
    const mostMissing = Math.max(...short.map((a) => a.missing_units ?? 0))
    const have = available ?? 0
    return {
      kind: 'short',
      price,
      available: have,
      missing: Math.max(price - have, mostMissing),
    }
  }

  const unpricedCount = outcomes.length - priced.length
  if (price === 0 && unpricedCount === 0) return { kind: 'none' }
  return {
    kind: 'enough',
    price,
    available,
    ...(unpricedCount > 0
      ? { unpriced: { count: unpricedCount, of: outcomes.length } }
      : {}),
    ...(batch && available !== null && price > available
      ? { mayFallShort: true }
      : {}),
  }
}

// ── The words ──

export function pricePendingText(language: Language): string {
  return translate(language, 'panel.priceEstimate.pending')
}

export function priceFailedText(language: Language): string {
  return translate(language, 'panel.priceEstimate.failed')
}

export function priceUnpricedText(language: Language, batch: boolean): string {
  return translate(language, batch ? 'panel.priceEstimate.unpricedBatch' : 'panel.priceEstimate.unpriced')
}

export function priceMayFallShortText(language: Language): string {
  return translate(language, 'panel.priceEstimate.mayFallShort')
}

export function afterPurchaseText(language: Language): string {
  return translate(language, 'panel.priceEstimate.afterPurchase')
}

export function unitsNowEnoughText(language: Language): string {
  return translate(language, 'panel.priceEstimate.unitsNowEnough')
}

export function priceEnoughText(language: Language, price: number, available: number | null): string {
  const formattedPrice = formatUnits(language, price)
  if (available === null) {
    return translate(language, 'panel.priceEstimate.enough', { price: formattedPrice })
  }
  return translate(language, 'panel.priceEstimate.enoughAvailable', {
    price: formattedPrice,
    available: formatUnits(language, available),
  })
}

/** "Для 1 з 3 файлів порахувати до обробки не вдалося." */
export function unpricedFilesText(language: Language, count: number, of: number): string {
  return translate(language, 'panel.priceEstimate.unpricedFiles', { count, of })
}

export function priceShortText(
  language: Language,
  price: number,
  available: number,
  missing: number,
): string {
  return translate(language, 'panel.priceEstimate.short', {
    price: formatUnits(language, price),
    available: formatUnits(language, available),
    missing: formatUnits(language, missing),
  })
}
