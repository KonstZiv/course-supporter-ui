import type {
  AuthorEstimateResponse,
  MaterialEstimateKind,
  ProcessingEstimateRequest,
} from '../types/api'
import { formatUnits, pluralWord } from './units'

// The price before an author's paid action (BIL-E): what an estimate answer
// means on the screen. A pure module — the view and its words; the requests
// are the caller's.

/**
 * The features each kind of material needs for a price. Mirrors the server's
 * `estimate_processing` (`cost_estimate/actions.py`): a kind sent without one
 * of them is priced 0 — "no estimate", which is not "free".
 */
export const REQUIRED_FEATURES: Readonly<
  Record<MaterialEstimateKind, readonly (keyof ProcessingEstimateRequest)[]>
> = {
  audio: ['duration_sec'],
  video: ['duration_sec'],
  presentation: ['slides', 'text_chars'],
  text: ['text_chars'],
  web: ['text_chars'],
  code: ['files', 'text_chars'],
}

/** Whether the request carries every feature its kind needs. */
export function hasRequiredFeatures(request: ProcessingEstimateRequest): boolean {
  return REQUIRED_FEATURES[request.kind].every((name) => {
    const value = request[name]
    return typeof value === 'number' && Number.isFinite(value)
  })
}

/** One estimate as it came back. */
export type EstimateOutcome =
  | { status: 'failed' }
  | {
      status: 'answered'
      answer: AuthorEstimateResponse
      /** The features the kind needs were sent: the price means something. */
      priced: boolean
    }

/** What the price card shows. P = price, A = available, M = missing. */
export type PriceView =
  | { kind: 'pending' }
  /** Charging is off, or nothing in the action is paid: nothing shown. */
  | { kind: 'none' }
  /** The request failed (network, 5xx). */
  | { kind: 'failed' }
  /** The features could not be read: no price before processing. */
  | { kind: 'unpriced'; batch: boolean }
  | {
      kind: 'enough'
      price: number
      available: number | null
      /** Files of a batch the price leaves out (their features unread). */
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
 * the sum cannot tell them apart).
 */
export function batchPriceView(outcomes: readonly EstimateOutcome[]): PriceView {
  if (outcomes.length === 0) return { kind: 'none' }
  const answered = outcomes.filter(
    (o): o is Extract<EstimateOutcome, { status: 'answered' }> =>
      o.status === 'answered',
  )
  if (answered.length === 0) return { kind: 'failed' }
  if (answered.some((o) => !o.answer.charging_enabled)) return { kind: 'none' }

  const priced = answered.filter((o) => o.priced)
  const batch = outcomes.length > 1
  // A file whose request failed counts with the unpriced ones: the batch
  // still has an answer about charging from the others.
  if (priced.length === 0) return { kind: 'unpriced', batch }

  const price = priced.reduce((sum, o) => sum + o.answer.price_units, 0)
  const available =
    priced.map((o) => o.answer.available_units).find((a) => a !== null) ?? null
  const short = priced.filter((o) => !o.answer.enough)
  if (short.length > 0) {
    const mostMissing = Math.max(...short.map((o) => o.answer.missing_units ?? 0))
    const have = available ?? 0
    return {
      kind: 'short',
      price,
      available: have,
      missing: Math.max(price - have, mostMissing),
    }
  }

  const unpricedCount = outcomes.length - priced.length
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

export const PRICE_PENDING = 'Рахуємо орієнтовну вартість…'
export const PRICE_FAILED = 'Орієнтовну вартість зараз порахувати не вдалося.'
export const PRICE_UNPRICED =
  'Орієнтовну вартість цього матеріалу до обробки порахувати не вдалося.'
export const PRICE_UNPRICED_BATCH =
  'Орієнтовну вартість цих матеріалів до обробки порахувати не вдалося.'
export const PRICE_MAY_FALL_SHORT =
  'На всі файли разом юнітів може не вистачити: обробка тих, на які не вистачить, зупиниться, і її можна буде запустити ще раз після купівлі.'
export const AFTER_PURCHASE =
  'Після купівлі поверніться на цю вкладку й запустіть дію ще раз.'
export const UNITS_NOW_ENOUGH = 'Юнітів тепер вистачає.'

export function priceEnoughText(price: number, available: number | null): string {
  const head = `Орієнтовна вартість: приблизно ${formatUnits(price)}.`
  return available === null ? head : `${head} У вас доступно ${formatUnits(available)}.`
}

/** "Для 1 з 3 файлів порахувати до обробки не вдалося." */
export function unpricedFilesText(count: number, of: number): string {
  const files = pluralWord(of, {
    one: 'файла',
    few: 'файлів',
    many: 'файлів',
    other: 'файла',
  })
  return `Для ${count} з ${of} ${files} порахувати до обробки не вдалося.`
}

export function priceShortText(
  price: number,
  available: number,
  missing: number,
): string {
  return `Ця дія коштує приблизно ${formatUnits(price)}, у вас ${formatUnits(available)}. Не вистачає ${formatUnits(missing)}.`
}
