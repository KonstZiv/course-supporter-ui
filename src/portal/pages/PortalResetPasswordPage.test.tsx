import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalResetPasswordPage } from './PortalResetPasswordPage'
import { portalApi, PortalApiError } from '../api/portalClient'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, resetPassword: vi.fn() },
  }
})

const TENANT_A = '019eda80-67ea-7060-b4c4-9dc85761690e'
const mockedReset = vi.mocked(portalApi.resetPassword)

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:tenantId/reset-password"
          element={<PortalResetPasswordPage />}
        />
        <Route path="/:tenantId/login" element={<div>LOGIN PAGE</div>} />
        <Route
          path="/:tenantId/forgot-password"
          element={<div>FORGOT PAGE</div>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains a missing token and never shows the form', () => {
    renderAt(`/${TENANT_A}/reset-password`)
    expect(screen.getByText('Посилання неповне або пошкоджене.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Новий пароль')).not.toBeInTheDocument()
  })

  it('resets and shows success with a go-to-login CTA on 204', async () => {
    mockedReset.mockResolvedValue(undefined)
    renderAt(`/${TENANT_A}/reset-password?token=tok123`)
    fireEvent.change(screen.getByLabelText('Новий пароль'), {
      target: { value: 'longenough1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /зберегти пароль/i }))

    await waitFor(() => {
      expect(screen.getByText(/пароль змінено/i)).toBeInTheDocument()
    })
    expect(mockedReset).toHaveBeenCalledWith({
      token: 'tok123',
      password: 'longenough1',
    })
    expect(screen.getByText(/перейти до входу/i)).toBeInTheDocument()
  })

  it('pre-validates the minimum length without POSTing', () => {
    renderAt(`/${TENANT_A}/reset-password?token=tok123`)
    fireEvent.change(screen.getByLabelText('Новий пароль'), {
      target: { value: 'short' },
    })
    fireEvent.click(screen.getByRole('button', { name: /зберегти пароль/i }))

    expect(screen.getByText(/щонайменше 10 символів/i)).toBeInTheDocument()
    expect(mockedReset).not.toHaveBeenCalled()
  })

  it('drops the form on a 400 and offers a fresh forgot request', async () => {
    mockedReset.mockRejectedValue(new PortalApiError(400, 'invalid token'))
    renderAt(`/${TENANT_A}/reset-password?token=stale`)
    fireEvent.change(screen.getByLabelText('Новий пароль'), {
      target: { value: 'longenough1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /зберегти пароль/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Посилання недійсне або протерміноване.'),
      ).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Новий пароль')).not.toBeInTheDocument()
    expect(screen.getByText(/запросити нове посилання/i)).toBeInTheDocument()
  })
})
