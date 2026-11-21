import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The payment provider requires the support address on every screen: every
// route of the portal router shows the site's footer exactly once. The
// server never answers here — the footer must not wait for data.
vi.mock('./api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/portalClient')>()
  const pending = Object.fromEntries(
    Object.keys(actual.portalApi).map((name) => [name, vi.fn(() => new Promise(() => {}))]),
  )
  return { ...actual, portalLogin: vi.fn(), portalApi: pending }
})

import { PortalApp } from './App'
import { usePortalSession } from './stores/session'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const ROOT = '019edaa5-2222-7000-8000-000000000002'
const SUPPORT = 'support@pythoncourse.me'

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
})

describe('Portal — the support address on every route', () => {
  it.each([
    ['sign-in', `/${T}/login`, false],
    ['password recovery', `/${T}/forgot-password`, false],
    ['new password', `/${T}/reset-password?token=abc`, false],
    ['e-mail confirmation', `/${T}/confirm-email?token=abc`, false],
    ['my courses', `/${T}/home`, true],
    ['a course', `/${T}/courses/${ROOT}`, true],
    ['units', `/${T}/billing`, true],
    ['back from the payment', `/${T}/billing/checkouts/chk_1`, true],
    ['the tenant root', `/${T}`, true],
    ['an invalid link', '/', false],
    ['a non-UUID tenant on a guarded page', '/not-a-uuid/home', false],
    ['a non-UUID tenant on the sign-in', '/not-a-uuid/login', false],
  ])('%s (%s): one footer with one support link', (_, path, signedIn) => {
    if (signedIn) {
      usePortalSession.getState().setSession({
        token: 'jwt',
        tenantId: T,
        studentId: '019edaa5-1111-7000-8000-000000000001',
        displayName: 'Олена',
      })
    }
    renderAt(path)
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: SUPPORT })).toHaveLength(1)
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: SUPPORT })).toHaveAttribute(
      'href',
      `mailto:${SUPPORT}`,
    )
  })
})
