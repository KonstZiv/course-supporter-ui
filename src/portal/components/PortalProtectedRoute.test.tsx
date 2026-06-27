import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalProtectedRoute } from './PortalProtectedRoute'
import { usePortalSession } from '../stores/session'

const TENANT_A = '019eda80-67ea-7060-b4c4-9dc85761690e'
const TENANT_B = '019edb00-0000-7000-8000-000000000002'

function seedSession(tenantId: string) {
  usePortalSession.getState().setSession({
    token: 'jwt',
    tenantId,
    studentId: '019edaa5-1111-7000-8000-000000000001',
    displayName: 'Олена',
  })
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:tenantId/login" element={<div>LOGIN PAGE</div>} />
        <Route
          path="/:tenantId/home"
          element={
            <PortalProtectedRoute>
              <div>PROTECTED CONTENT</div>
            </PortalProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().clear()
  })

  it('redirects to the tenant login when there is no session', () => {
    renderAt(`/${TENANT_A}/home`)
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
    expect(screen.queryByText('PROTECTED CONTENT')).not.toBeInTheDocument()
  })

  it('renders children when the session tenant matches the URL', () => {
    seedSession(TENANT_A)
    renderAt(`/${TENANT_A}/home`)
    expect(screen.getByText('PROTECTED CONTENT')).toBeInTheDocument()
  })

  it('clears a foreign-tenant session and redirects to login (Q3 guard)', () => {
    seedSession(TENANT_A)
    renderAt(`/${TENANT_B}/home`)
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument()
    expect(screen.queryByText('PROTECTED CONTENT')).not.toBeInTheDocument()
    // The tenant-A token must not linger when the URL points at tenant B.
    expect(usePortalSession.getState().token).toBeNull()
  })

  it('shows the invalid-link page for a non-UUID tenant segment', () => {
    renderAt('/not-a-uuid/home')
    expect(screen.getByText('Невірне посилання')).toBeInTheDocument()
  })
})
