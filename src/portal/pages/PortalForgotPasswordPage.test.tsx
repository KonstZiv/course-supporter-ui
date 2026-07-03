import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalForgotPasswordPage } from './PortalForgotPasswordPage'
import { portalApi, PortalApiError } from '../api/portalClient'

// Keep the real PortalApiError (the page's catch uses instanceof); mock only
// the network call.
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, forgotPassword: vi.fn() },
  }
})

const TENANT_A = '019eda80-67ea-7060-b4c4-9dc85761690e'
const mockedForgot = vi.mocked(portalApi.forgotPassword)

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:tenantId/forgot-password"
          element={<PortalForgotPasswordPage />}
        />
        <Route path="/:tenantId/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the invalid-link page for a non-UUID tenant segment', () => {
    renderAt('/not-a-uuid/forgot-password')
    expect(screen.getByText('Невірне посилання')).toBeInTheDocument()
    expect(screen.queryByLabelText('Логін')).not.toBeInTheDocument()
  })

  it('shows a generic success and hides the form on 202', async () => {
    mockedForgot.mockResolvedValue(undefined)
    renderAt(`/${TENANT_A}/forgot-password`)
    fireEvent.change(screen.getByLabelText('Логін'), {
      target: { value: 'olena' },
    })
    fireEvent.click(screen.getByRole('button', { name: /надіслати/i }))

    await waitFor(() => {
      expect(screen.getByText(/ми надіслали на неї/i)).toBeInTheDocument()
    })
    expect(mockedForgot).toHaveBeenCalledWith({
      tenant_id: TENANT_A,
      login: 'olena',
    })
    // Form is gone (anti-enumeration: no signal about the login).
    expect(screen.queryByLabelText('Логін')).not.toBeInTheDocument()
  })

  it('renders the rate-limit phrase on 429 and keeps the form', async () => {
    mockedForgot.mockRejectedValue(new PortalApiError(429, 'rate limited'))
    renderAt(`/${TENANT_A}/forgot-password`)
    fireEvent.change(screen.getByLabelText('Логін'), {
      target: { value: 'olena' },
    })
    fireEvent.click(screen.getByRole('button', { name: /надіслати/i }))

    await waitFor(() => {
      expect(screen.getByText(/забагато спроб/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Логін')).toBeInTheDocument()
  })
})
