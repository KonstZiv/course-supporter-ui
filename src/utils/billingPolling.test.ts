import { describe, expect, it } from 'vitest'
import {
  FAST_INTERVAL_MS,
  FAST_PHASE_MS,
  nextPollDelay,
  POLL_LIMIT_MS,
  pollStage,
  SLOW_INTERVAL_MS,
} from './billingPolling'

describe('checkout polling schedule', () => {
  it('asks every 2 s in the first minute, then every 10 s up to 10 min', () => {
    expect([FAST_INTERVAL_MS, FAST_PHASE_MS, SLOW_INTERVAL_MS, POLL_LIMIT_MS]).toEqual([
      2_000, 60_000, 10_000, 600_000,
    ])
    expect(nextPollDelay(0)).toBe(2_000)
    expect(nextPollDelay(59_999)).toBe(2_000)
    expect(nextPollDelay(60_000)).toBe(10_000)
    expect(nextPollDelay(599_999)).toBe(10_000)
    expect(nextPollDelay(600_000)).toBeNull()
  })

  it('names the stage of the wait', () => {
    expect(pollStage(0)).toBe('first-minute')
    expect(pollStage(60_000)).toBe('waiting')
    expect(pollStage(600_000)).toBe('stopped')
  })
})
