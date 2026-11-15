import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The payment provider brings the student back to
// /<tenant>/billing/checkouts/<ref> (backend `return_urls`); the portal moves
// the number to the units page's `checkout` parameter. Without a session the
// sign-in comes first and leads back. The real portal router; its requests
// mocked.
const api = vi.hoisted(() => ({
  billingCheckoutState: vi.fn(),
  billingBalance: vi.fn(),
  billingPackages: vi.fn(),
  billingStatement: vi.fn(),
  billingOutlook: vi.fn(),
}))
vi.mock('./api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/portalClient')>()
  return {
    ...actual,
    portalLogin: vi.fn(),
    portalApi: { ...actual.portalApi, ...api },
  }
})

import { PortalApp } from './App'
import { portalLogin } from './api/portalClient'
import { usePortalSession } from './stores/session'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'

function signIn() {
  usePortalSession.getState().setSession({
    token: 'jwt',
    tenantId: T,
    studentId: '019edaa5-1111-7000-8000-000000000001',
    displayName: 'Олена',
  })
}

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  for (const mock of Object.values(api)) mock.mockReset()
  vi.mocked(portalLogin).mockReset()
  api.billingCheckoutState.mockResolvedValue({
    state: 'pending',
    package_id: 'units-500',
    units: null,
    balance_after: null,
  })
  api.billingBalance.mockResolvedValue({
    balance: 0,
    reserved: 0,
    held: 0,
    available: 0,
    difference: 0,
    next_expiry: null,
  })
  api.billingPackages.mockResolvedValue({ packages: [], purchase: { open: true, reason: null } })
  api.billingStatement.mockResolvedValue({ items: [], next_cursor: null })
  api.billingOutlook.mockResolvedValue({
    reviews_left: null,
    warning: null,
    expiring_soon: null,
    paid_by: 'self',
  })
})

describe('portal billing routes', () => {
  it('/T/billing/checkouts/abc moves to /T/billing?checkout=abc and asks the state of abc', async () => {
    signIn()
    const router = renderAt(`/${T}/billing/checkouts/abc`)
    expect(await screen.findByText('Зараховуємо…')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/${T}/billing`)
    expect(router.state.location.search).toBe('?checkout=abc')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(api.billingCheckoutState).toHaveBeenCalledWith('abc')
  })

  it("encodes the number and drops the provider's own parameters", async () => {
    signIn()
    const router = renderAt(`/${T}/billing/checkouts/a%20b?checkout_id=ch_1&signature=x`)
    await screen.findByText('Зараховуємо…')
    expect(router.state.location.search).toBe('?checkout=a%20b')
    expect(api.billingCheckoutState).toHaveBeenCalledWith('a b')
  })

  it('/T/billing?checkout=cancelled drops the parameter without asking', async () => {
    signIn()
    const router = renderAt(`/${T}/billing?checkout=cancelled`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Юніти' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.location.pathname).toBe(`/${T}/billing`)
    expect(api.billingCheckoutState).not.toHaveBeenCalled()
  })

  it('/T/billing/checkouts/abc without a session: sign-in with next, then /T/billing?checkout=abc', async () => {
    vi.mocked(portalLogin).mockResolvedValue({
      access_token: 'jwt-token',
      token_type: 'bearer',
      student_id: '019edaa5-1111-7000-8000-000000000001',
      display_name: 'Олена',
    })
    const router = renderAt(`/${T}/billing/checkouts/abc`)
    expect(await screen.findByLabelText('Логін')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/${T}/login`)
    expect(router.state.location.search).toBe(
      `?next=${encodeURIComponent(`/${T}/billing/checkouts/abc`)}`,
    )
    expect(api.billingCheckoutState).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Логін'), { target: { value: 'olena' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /увійти/i }))
    expect(await screen.findByText('Зараховуємо…')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/${T}/billing`)
    expect(router.state.location.search).toBe('?checkout=abc')
    expect(api.billingCheckoutState).toHaveBeenCalledWith('abc')
  })

  it('/T/billing without a session: sign-in, then the units page', async () => {
    const router = renderAt(`/${T}/billing`)
    await screen.findByLabelText('Логін')
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent(`/${T}/billing`)}`)
  })
})
