// Which of the ten answers about a review's price the form gives (BIL-E,
// stage 2b, table 5.1) — the first that holds, from the top. A pure module:
// the estimate's outcome in, what to show out; the words are `unitsTexts`.
//
// Rows 1 and 2 (the author pays; charging is off) are read from the LAST
// estimate answered, not only from the one in flight: neither depends on the
// file, so a new file does not make a student whose author pays, or a student
// while charging is off, see a count or a disabled button. Before any answer
// has come, nothing is known and the form is as it was before this stage;
// a submission sent in that moment is the server's to refuse (402), and the
// form then shows the same panel.

import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'
import type { PortalReviewEstimate, PortalUnitsShortfall } from './types'
import { ceilingEnough, ceilingShort, pricedEnough, pricedShort } from './unitsTexts'

/** Where the estimate of the current file (or of none) stands. */
export type EstimateOutcome =
  | { status: 'pending' }
  // ``afterWait``: the estimate asked again once the units reached the
  // threshold the panel waited for.
  | { status: 'ready'; estimate: PortalReviewEstimate; afterWait: boolean }
  // 422: the doors refuse the file; the sentence is the submission's own.
  | { status: 'refused'; message: string }
  // The network, a 5xx, a 404.
  | { status: 'failed' }
  // 401: the client is already taking the student to sign in.
  | { status: 'silent' }

/** What the form shows above its button, and what becomes of the button. */
export type CostView =
  // Nothing new: the form as it was.
  | { kind: 'nothing' }
  // A plain line (rows 1, 3, 4). ``gated``: the button waits for the answer.
  | { kind: 'line'; text: string; gated: boolean }
  // The doors' refusal of the file (row 5); the button stays.
  | { kind: 'refusal'; text: string }
  // The cost card (rows 6, 7, 9). ``nowEnough``: the units came while the
  // panel waited.
  | { kind: 'card'; text: string; nowEnough: boolean }
  // The not-enough panel in place of the button (rows 8, 10). ``threshold``:
  // the units available before the form asks again.
  | { kind: 'panel'; text: string; threshold: number }

const NOTHING: CostView = { kind: 'nothing' }

function fromEstimate(
  language: Language,
  e: PortalReviewEstimate,
  afterWait: boolean,
): CostView {
  const price = e.price_units ?? 0
  const available = e.available_units ?? 0
  const missing = e.missing_units ?? 0
  if (e.price_units === 0 && e.enough) {
    return {
      kind: 'card',
      text: translate(language, 'portal.units.freeReview'),
      nowEnough: afterWait,
    }
  }
  if (e.basis === 'ceiling') {
    return e.enough
      ? { kind: 'card', text: ceilingEnough(language, price, available), nowEnough: afterWait }
      : // The threshold is the task's typical price, not the ceiling shown.
        {
          kind: 'panel',
          text: ceilingShort(language, price, available, missing),
          threshold: available + missing,
        }
  }
  return e.enough
    ? { kind: 'card', text: pricedEnough(language, price, available), nowEnough: afterWait }
    : {
        kind: 'panel',
        text: pricedShort(language, price, available, missing),
        threshold: available + missing,
      }
}

/**
 * The answer of table 5.1 for this outcome, given the last estimate answered
 * (``last``; null — none yet).
 */
export function costView(
  language: Language,
  outcome: EstimateOutcome,
  last: PortalReviewEstimate | null,
): CostView {
  const known = outcome.status === 'ready' ? outcome.estimate : last
  if (known?.paid_by === 'author') {
    return { kind: 'line', text: translate(language, 'portal.units.paidByAuthor'), gated: false }
  }
  if (known && !known.charging_enabled) return NOTHING
  switch (outcome.status) {
    case 'pending':
      return known
        ? { kind: 'line', text: translate(language, 'portal.units.counting'), gated: true }
        : NOTHING
    case 'failed':
      return {
        kind: 'line',
        text: translate(language, 'portal.units.priceUnavailable'),
        gated: false,
      }
    case 'refused':
      return { kind: 'refusal', text: outcome.message }
    case 'silent':
      return NOTHING
    case 'ready':
      return fromEstimate(language, outcome.estimate, outcome.afterWait)
  }
}

/** What a test's form shows: only who pays, and the panel when nothing is left. */
export type TestCostView = 'as_before' | 'author' | 'panel' | 'now_enough'

/**
 * A test is reviewed without units while something of a package is left: the
 * form says who pays, or stands the panel in place of its button — nothing
 * else (no price, no count, no failure line).
 */
export function testCostView(
  outcome: EstimateOutcome,
  last: PortalReviewEstimate | null,
): TestCostView {
  const known = outcome.status === 'ready' ? outcome.estimate : last
  if (known?.paid_by === 'author') return 'author'
  if (outcome.status !== 'ready' || !outcome.estimate.charging_enabled) return 'as_before'
  if (!outcome.estimate.enough) return 'panel'
  return outcome.afterWait ? 'now_enough' : 'as_before'
}

/** A test may be sent once anything is available: "available > 0". */
export const TEST_THRESHOLD = 1

/**
 * The server's own refusal of a submission (402), as an estimate: its numbers,
 * not enough, and the basis of the last estimate — so a review priced at its
 * ceiling keeps the ceiling's words.
 */
export function shortfallEstimate(
  shortfall: PortalUnitsShortfall,
  lastBasis: PortalReviewEstimate['basis'] | null,
): PortalReviewEstimate {
  return {
    ...shortfall,
    enough: false,
    charging_enabled: true,
    basis: lastBasis === 'ceiling' ? 'ceiling' : 'file',
    paid_by: 'self',
  }
}
