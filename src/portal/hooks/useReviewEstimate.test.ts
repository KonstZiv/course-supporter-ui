import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useReviewEstimate } from './useReviewEstimate'
import { portalApi } from '../api/portalClient'
import type { PortalReviewEstimate } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      estimateTask: vi.fn(),
    },
  }
})

const mockedEstimate = vi.mocked(portalApi.estimateTask)

const estimate = (over: Partial<PortalReviewEstimate> = {}): PortalReviewEstimate => ({
  price_units: 5,
  available_units: 20,
  enough: true,
  missing_units: 0,
  charging_enabled: true,
  basis: 'typical',
  paid_by: 'self',
  ...over,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useReviewEstimate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('re-estimates when responseLanguage changes and drops stale responses', async () => {
    const first = deferred<PortalReviewEstimate>()
    const second = deferred<PortalReviewEstimate>()
    mockedEstimate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result, rerender } = renderHook(
      ({ lang }: { lang: string | null }) => useReviewEstimate('task-1', null, lang),
      { initialProps: { lang: 'ukr' as string | null } },
    )

    expect(mockedEstimate).toHaveBeenCalledTimes(1)
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', null, 'ukr')

    rerender({ lang: 'eng' })
    expect(mockedEstimate).toHaveBeenCalledTimes(2)
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', null, 'eng')
    expect(result.current.outcome).toEqual({ status: 'pending' })

    const newer = estimate({ price_units: 8 })
    await act(async () => second.resolve(newer))
    expect(result.current.outcome).toEqual({
      status: 'ready',
      estimate: newer,
      afterWait: false,
    })

    // Late answer to the previous language request must not overwrite the newer one.
    await act(async () => first.resolve(estimate({ price_units: 0 })))
    expect(result.current.outcome).toEqual({
      status: 'ready',
      estimate: newer,
      afterWait: false,
    })
  })
})
