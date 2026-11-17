import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { AuthorEstimateResponse } from '../types/api'
import { RECHECK_MS, useActionPrice, type PriceRequest } from './useActionPrice'

const SHORT: AuthorEstimateResponse = {
  price_units: 120,
  available_units: 40,
  enough: false,
  missing_units: 80,
  charging_enabled: true,
}
const ENOUGH: AuthorEstimateResponse = {
  ...SHORT,
  available_units: 540,
  enough: true,
  missing_units: null,
}

function visibility(state: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
}

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useActionPrice — after the purchase', () => {
  it('re-asks every 10 s while the tab is in view, then opens the action', async () => {
    vi.useFakeTimers()
    visibility('visible')
    const estimate = vi.fn().mockResolvedValue(SHORT)
    const requests: PriceRequest[] = [{ estimate, priced: true }]
    const { result } = renderHook(() => useActionPrice(requests))
    await flush()
    expect(result.current.view.kind).toBe('short')
    expect(result.current.ready).toBe(false)
    expect(estimate).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECHECK_MS)
    })
    expect(estimate).toHaveBeenCalledTimes(2)
    expect(result.current.view.kind).toBe('short')

    estimate.mockResolvedValue(ENOUGH)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECHECK_MS)
    })
    expect(estimate).toHaveBeenCalledTimes(3)
    expect(result.current.view).toEqual({ kind: 'enough', price: 120, available: 540 })
    expect(result.current.recovered).toBe(true)
    expect(result.current.ready).toBe(true)

    // Enough now: no more asking.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECHECK_MS * 3)
    })
    expect(estimate).toHaveBeenCalledTimes(3)
  })

  it('a hidden tab is not asked on the clock; coming back into view asks at once', async () => {
    vi.useFakeTimers()
    visibility('hidden')
    const estimate = vi.fn().mockResolvedValue(SHORT)
    const requests: PriceRequest[] = [{ estimate, priced: true }]
    const { result } = renderHook(() => useActionPrice(requests))
    await flush()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECHECK_MS * 2)
    })
    expect(estimate).toHaveBeenCalledTimes(1)

    estimate.mockResolvedValue(ENOUGH)
    visibility('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.recovered).toBe(true)
    expect(result.current.view.kind).toBe('enough')
  })

  it('a failed re-ask keeps the panel', async () => {
    vi.useFakeTimers()
    visibility('visible')
    const estimate = vi.fn().mockResolvedValue(SHORT)
    const requests: PriceRequest[] = [{ estimate, priced: true }]
    const { result } = renderHook(() => useActionPrice(requests))
    await flush()
    estimate.mockRejectedValue(new TypeError('Failed to fetch'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECHECK_MS)
    })
    expect(result.current.view.kind).toBe('short')
    expect(result.current.recovered).toBe(false)
  })

  it('nothing to price: ready at once, nothing asked', () => {
    const none: PriceRequest[] = []
    const { result } = renderHook(() => useActionPrice(none))
    expect(result.current.view).toEqual({ kind: 'none' })
    expect(result.current.ready).toBe(true)
  })

  it('requests still being prepared: pending, the action waits', () => {
    const { result } = renderHook(() => useActionPrice(null))
    expect(result.current.view).toEqual({ kind: 'pending' })
    expect(result.current.ready).toBe(false)
  })
})
