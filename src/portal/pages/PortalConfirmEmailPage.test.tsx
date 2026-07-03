import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalConfirmEmailPage } from './PortalConfirmEmailPage'
import { portalApi, PortalApiError } from '../api/portalClient'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, confirmEmail: vi.fn() },
  }
})

const TENANT_A = '019eda80-67ea-7060-b4c4-9dc85761690e'
const mockedConfirm = vi.mocked(portalApi.confirmEmail)

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/:tenantId/confirm-email"
          element={<PortalConfirmEmailPage />}
        />
        <Route path="/:tenantId" element={<div>TENANT INDEX</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalConfirmEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains a missing token and shows no confirm button', () => {
    renderAt(`/${TENANT_A}/confirm-email`)
    expect(screen.getByText('Посилання неповне або пошкоджене.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /підтвердити/i }),
    ).not.toBeInTheDocument()
  })

  it('does NOT redeem on mount — only on the explicit button click', async () => {
    mockedConfirm.mockResolvedValue(undefined)
    renderAt(`/${TENANT_A}/confirm-email?token=tok123`)
    // Nothing fired yet.
    expect(mockedConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /підтвердити/i }))
    await waitFor(() => {
      expect(screen.getByText(/пошту підтверджено/i)).toBeInTheDocument()
    })
    expect(mockedConfirm).toHaveBeenCalledWith({ token: 'tok123' })
    expect(screen.getByText(/перейти до порталу/i)).toBeInTheDocument()
  })

  it('shows the terminal invalid-link panel on a 400', async () => {
    mockedConfirm.mockRejectedValue(new PortalApiError(400, 'invalid token'))
    renderAt(`/${TENANT_A}/confirm-email?token=stale`)
    fireEvent.click(screen.getByRole('button', { name: /підтвердити/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Посилання недійсне або протерміноване.'),
      ).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: /підтвердити/i }),
    ).not.toBeInTheDocument()
  })
})
