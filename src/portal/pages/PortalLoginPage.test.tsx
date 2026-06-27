import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalLoginPage } from './PortalLoginPage'
import { usePortalSession } from '../stores/session'
import { portalLogin, PortalApiError } from '../api/portalClient'

// Keep the real PortalApiError (the page's catch uses ``instanceof``); mock
// only the network call.
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalLogin: vi.fn() }
})

const TENANT_A = '019eda80-67ea-7060-b4c4-9dc85761690e'
const mockedLogin = vi.mocked(portalLogin)

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:tenantId/login" element={<PortalLoginPage />} />
        <Route path="/:tenantId/home" element={<div>HOME PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Логін'), {
    target: { value: 'olena' },
  })
  fireEvent.change(screen.getByLabelText('Пароль'), {
    target: { value: 'secret' },
  })
}

describe('PortalLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    usePortalSession.getState().clear()
  })

  it('shows the invalid-link page for a non-UUID tenant segment', () => {
    renderAt('/not-a-uuid/login')
    expect(screen.getByText('Невірне посилання')).toBeInTheDocument()
    expect(screen.queryByLabelText('Логін')).not.toBeInTheDocument()
  })

  it('stores the session and navigates home on success', async () => {
    mockedLogin.mockResolvedValue({
      access_token: 'jwt-token',
      token_type: 'bearer',
      student_id: '019edaa5-1111-7000-8000-000000000001',
      display_name: 'Олена',
    })
    renderAt(`/${TENANT_A}/login`)
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: /увійти/i }))

    await waitFor(() => {
      expect(screen.getByText('HOME PAGE')).toBeInTheDocument()
    })
    expect(mockedLogin).toHaveBeenCalledWith({
      tenant_id: TENANT_A,
      login: 'olena',
      password: 'secret',
    })
    const session = usePortalSession.getState()
    expect(session.token).toBe('jwt-token')
    expect(session.tenantId).toBe(TENANT_A)
  })

  it('renders a generic error on 401 without storing a session', async () => {
    mockedLogin.mockRejectedValue(new PortalApiError(401, 'unauthorized'))
    renderAt(`/${TENANT_A}/login`)
    fillCredentials()
    fireEvent.click(screen.getByRole('button', { name: /увійти/i }))

    await waitFor(() => {
      expect(screen.getByText('Невірний логін або пароль.')).toBeInTheDocument()
    })
    expect(usePortalSession.getState().token).toBeNull()
  })

  it('redirects to home when already signed in for this tenant', () => {
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: TENANT_A,
      studentId: '019edaa5-1111-7000-8000-000000000001',
      displayName: 'Олена',
    })
    renderAt(`/${TENANT_A}/login`)
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument()
  })
})
