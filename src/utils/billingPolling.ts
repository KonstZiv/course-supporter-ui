// How often the billing page asks for the state of a checkout after the
// author comes back from the payment page, and for how long. Asked every
// FAST_INTERVAL_MS through the first FAST_PHASE_MS, then every
// SLOW_INTERVAL_MS until POLL_LIMIT_MS have passed; then no more.

export const FAST_INTERVAL_MS = 2_000
export const FAST_PHASE_MS = 60_000
export const SLOW_INTERVAL_MS = 10_000
export const POLL_LIMIT_MS = 10 * 60_000

/** The wait before the next ask, `elapsedMs` after the first; null: stop. */
export function nextPollDelay(elapsedMs: number): number | null {
  if (elapsedMs < FAST_PHASE_MS) return FAST_INTERVAL_MS
  if (elapsedMs < POLL_LIMIT_MS) return SLOW_INTERVAL_MS
  return null
}

/**
 * Where the wait stands, `elapsedMs` after the first ask: the first minute,
 * after it, or over (no more asks).
 */
export type PollStage = 'first-minute' | 'waiting' | 'stopped'

export function pollStage(elapsedMs: number): PollStage {
  if (elapsedMs < FAST_PHASE_MS) return 'first-minute'
  if (elapsedMs < POLL_LIMIT_MS) return 'waiting'
  return 'stopped'
}
