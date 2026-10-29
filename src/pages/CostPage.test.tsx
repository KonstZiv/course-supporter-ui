import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CostPage } from './CostPage'
import type { CostSummaryResponse } from '../types/api'

// Smoke-level coverage only (per task 0.UI scope). Goal: prove the
// vitest + RTL pipeline is wired correctly and that CostPage mounts
// without crashing while issuing the all-time summary fetch (no
// `from` / `to` params → backend tenant-fallback path). Future tasks
// extend coverage as new behaviour ships.
// `satisfies` makes tsc hold the mocked response to the contract type —
// an untyped `vi.mock` factory would let the fixture drift silently.
vi.mock('../api/cost', () => ({
  costApi: {
    summary: vi.fn(() =>
      Promise.resolve({
        from: '2026-01-01',
        to: '2026-04-30',
        total_usd: 12.3456,
        total_by_kind: { exact_usd: 12, estimated_usd: 0.3456, unknown_calls: 1 },
        unattributed_cost_usd: 0,
        unattributed_by_kind: { exact_usd: 0, estimated_usd: 0, unknown_calls: 0 },
        by_course: [],
        by_provider: [],
      } satisfies CostSummaryResponse),
    ),
  },
}))

describe('CostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title and fetches summary on mount', async () => {
    const { costApi } = await import('../api/cost')
    render(<CostPage />)

    expect(screen.getByText('Витрати')).toBeInTheDocument()
    expect(costApi.summary).toHaveBeenCalledTimes(1)
    expect(costApi.summary).toHaveBeenCalledWith({})

    await waitFor(() =>
      expect(screen.getByText('$12.3456')).toBeInTheDocument(),
    )
  })
})
