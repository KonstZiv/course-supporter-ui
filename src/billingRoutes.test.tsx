import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The payment provider brings the author back to /billing/checkouts/{ref}
// (backend `return_urls`); the program moves the number to the billing
// page's `checkout` parameter. The real page, its requests mocked; the shell's
// activity strip and the boot-time language prefetch reach no network.
vi.mock('./api/jobs', () => ({
  jobsApi: {
    history: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    get: vi.fn(),
  },
}))
vi.mock('./utils/languages', () => ({
  getLanguages: vi.fn().mockResolvedValue([]),
  getCachedLanguages: vi.fn().mockReturnValue(null),
  findLanguage: vi.fn().mockReturnValue(null),
}))
const api = vi.hoisted(() => ({
  getTerms: vi.fn(),
  postConsent: vi.fn(),
  getPackages: vi.fn(),
  postCheckout: vi.fn(),
  getCheckout: vi.fn(),
  getBalance: vi.fn(),
  getStatement: vi.fn(),
}))
vi.mock('./api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/billing')>()),
  ...api,
}))

import { createAppRouter } from './router'
import { useAuthStore } from './stores/auth'

function renderAt(path: string) {
  const router = createAppRouter((routes) =>
    createMemoryRouter(routes, { initialEntries: [path] }),
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('billing routes', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ apiKey: 'cs_live_key', connected: false })
    for (const mock of Object.values(api)) mock.mockReset()
    api.getBalance.mockResolvedValue({
      balance: 0,
      reserved: 0,
      held: 0,
      available: 0,
      difference: 0,
      next_expiry: null,
    })
    api.getPackages.mockResolvedValue({ packages: [], purchase: { open: true, reason: null } })
    api.getStatement.mockResolvedValue({ items: [], next_cursor: null })
    api.getCheckout.mockResolvedValue({
      state: 'pending',
      package_id: 'units-500',
      units: null,
      balance_after: null,
    })
  })

  it('/billing/checkouts/abc moves to /billing?checkout=abc and asks the state of abc', async () => {
    const router = renderAt('/billing/checkouts/abc')
    expect(await screen.findByText('Зараховуємо…')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/billing')
    expect(router.state.location.search).toBe('?checkout=abc')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(api.getCheckout).toHaveBeenCalledWith('abc')
  })

  it("encodes the number and drops the provider's own parameters", async () => {
    const router = renderAt('/billing/checkouts/a%20b?checkout_id=ch_1&signature=x')
    await screen.findByText('Зараховуємо…')
    expect(router.state.location.search).toBe('?checkout=a%20b')
    expect(api.getCheckout).toHaveBeenCalledWith('a b')
  })

  it('/billing/checkouts/abc without a key goes to the login page', async () => {
    useAuthStore.setState({ apiKey: null })
    const router = renderAt('/billing/checkouts/abc')
    expect(await screen.findByText('Вхід')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(api.getCheckout).not.toHaveBeenCalled()
  })

  it('/billing?checkout=cancelled drops the parameter without asking', async () => {
    const router = renderAt('/billing?checkout=cancelled')
    expect(await screen.findByRole('heading', { level: 1, name: 'Юніти' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.location.pathname).toBe('/billing')
    expect(api.getCheckout).not.toHaveBeenCalled()
  })

  it('the header leads to the units page', async () => {
    const router = renderAt('/help')
    const link = await screen.findByRole('link', { name: 'Юніти' })
    link.click()
    expect(await screen.findByRole('heading', { level: 1, name: 'Юніти' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/billing')
  })
})
