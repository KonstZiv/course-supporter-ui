import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseRetryAfter, useServiceStatus } from './store'

describe('useServiceStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-24T20:00:00Z'))
    useServiceStatus.setState({
      status: 'ok',
      since: null,
      retryAfter: 15,
      hasSucceeded: false,
      recoveryCount: 0,
      unsaved: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets since only on the transition from ok', () => {
    const firstAt = Date.now()
    useServiceStatus.getState().report('updating', 20)
    expect(useServiceStatus.getState().status).toBe('updating')
    expect(useServiceStatus.getState().since).toBe(firstAt)
    expect(useServiceStatus.getState().retryAfter).toBe(20)

    vi.advanceTimersByTime(30_000)
    useServiceStatus.getState().report('unreachable')
    expect(useServiceStatus.getState().status).toBe('unreachable')
    expect(useServiceStatus.getState().since).toBe(firstAt)
    expect(useServiceStatus.getState().retryAfter).toBe(15)
  })

  it('resets status and since on recover and increments recoveryCount only when saved', () => {
    useServiceStatus.getState().report('updating', 10)
    useServiceStatus.getState().recover()
    expect(useServiceStatus.getState().status).toBe('ok')
    expect(useServiceStatus.getState().since).toBeNull()
    expect(useServiceStatus.getState().hasSucceeded).toBe(true)
    expect(useServiceStatus.getState().recoveryCount).toBe(1)

    // Calling recover while already ok does not bump recoveryCount.
    useServiceStatus.getState().recover()
    expect(useServiceStatus.getState().recoveryCount).toBe(1)

    // With unsaved changes, recover clears the banner without bumping recoveryCount.
    useServiceStatus.getState().setUnsaved(true)
    useServiceStatus.getState().report('unreachable')
    useServiceStatus.getState().recover()
    expect(useServiceStatus.getState().status).toBe('ok')
    expect(useServiceStatus.getState().recoveryCount).toBe(1)
  })

  it('clamps retryAfter to [5, 120] and defaults to 15 when missing or non-integer', () => {
    expect(parseRetryAfter(null)).toBe(15)
    expect(parseRetryAfter(undefined)).toBe(15)
    expect(parseRetryAfter('')).toBe(15)
    expect(parseRetryAfter('abc')).toBe(15)
    expect(parseRetryAfter('12.5')).toBe(15)
    expect(parseRetryAfter('2')).toBe(5)
    expect(parseRetryAfter('5')).toBe(5)
    expect(parseRetryAfter('45')).toBe(45)
    expect(parseRetryAfter('120')).toBe(120)
    expect(parseRetryAfter('300')).toBe(120)
  })
})
