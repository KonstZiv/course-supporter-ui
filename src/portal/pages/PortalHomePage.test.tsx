import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalHomePage } from './PortalHomePage'
import { usePortalSession } from '../stores/session'
import { portalApi } from '../api/portalClient'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, courses: vi.fn(), me: vi.fn() },
  }
})

const TENANT = '019eda80-67ea-7060-b4c4-9dc85761690e'
const mockedCourses = vi.mocked(portalApi.courses)
// The recovery-email section (mounted on home) fetches /me on its own; give it
// a deterministic "no recovery email yet" answer so these course-list tests
// stay focused.
const mockedMe = vi.mocked(portalApi.me)

function renderHome() {
  render(
    <MemoryRouter initialEntries={[`/${TENANT}/home`]}>
      <Routes>
        <Route path="/:tenantId/home" element={<PortalHomePage />} />
        <Route path="/:tenantId/courses/:rootId" element={<div>COURSE PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalHomePage (course list)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: TENANT,
      studentId: 's1',
      displayName: 'Олена',
    })
    mockedMe.mockResolvedValue({
      student_id: 's1',
      tenant_id: TENANT,
      login: 'olena',
      display_name: 'Олена',
      recovery_email: null,
      recovery_email_confirmed: false,
      preferred_language: null,
    })
  })

  it('greets with the session display name and lists courses', async () => {
    mockedCourses.mockResolvedValue([
      { id: 'c1', title: 'Python' },
      { id: 'c2', title: 'Angular' },
    ])
    renderHome()
    expect(screen.getByText('Вітаємо, Олена!')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument()
      expect(screen.getByText('Angular')).toBeInTheDocument()
    })
  })

  it('navigates to the course tree on click', async () => {
    mockedCourses.mockResolvedValue([{ id: 'c1', title: 'Python' }])
    renderHome()
    await waitFor(() => expect(screen.getByText('Python')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Python'))
    await waitFor(() => expect(screen.getByText('COURSE PAGE')).toBeInTheDocument())
  })

  it('shows an empty state when not enrolled in anything', async () => {
    mockedCourses.mockResolvedValue([])
    renderHome()
    await waitFor(() => {
      expect(
        screen.getByText('Вас поки не зараховано на жоден курс.'),
      ).toBeInTheDocument()
    })
  })

  it('shows a soft error when the courses call fails', async () => {
    mockedCourses.mockRejectedValue(new Error('boom'))
    renderHome()
    await waitFor(() => {
      expect(screen.getByText('Не вдалося завантажити курси.')).toBeInTheDocument()
    })
  })
})
