import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StudentsPage } from './StudentsPage'
import { studentsApi } from '../api/students'

// Covers the T5-FE roster contract: tenant roster renders, the is_active
// triplet copy (Активний / Відкликано / Немає доступу до порталу — never
// "видалено"), single-page pagination counter + disabled controls, and the
// provision modal opening with author-language mode labels.
vi.mock('../api/students', () => ({
  studentsApi: {
    list: vi.fn(),
    enrollments: vi.fn(() =>
      Promise.resolve({ student_id: 's', items: [] }),
    ),
    provision: vi.fn(),
    revoke: vi.fn(),
    restore: vi.fn(),
    bind: vi.fn(),
    unbind: vi.fn(),
  },
}))
vi.mock('../api/nodes', () => ({
  nodesApi: {
    listRoots: vi.fn(() =>
      Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 }),
    ),
  },
}))

const ROSTER = {
  tenant_id: '019eda80-67ea-7060-b4c4-9dc85761690e',
  total: 3,
  limit: 20,
  offset: 0,
  items: [
    {
      student_id: 's1',
      external_id: 'e1',
      login: 'alice',
      display_name: 'Alice',
      is_active: true,
      enrollment_count: 2,
      source: 'author' as const,
    },
    {
      student_id: 's2',
      external_id: 'e2',
      login: 'bob',
      display_name: null,
      is_active: false,
      enrollment_count: 0,
      source: 'self' as const,
    },
    {
      student_id: 's3',
      external_id: 'e3',
      login: null,
      display_name: null,
      is_active: null,
      enrollment_count: 1,
      source: 'author' as const,
    },
  ],
}

beforeEach(() => {
  vi.mocked(studentsApi.list).mockResolvedValue(ROSTER)
})

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentsPage />
    </MemoryRouter>,
  )
}

describe('StudentsPage', () => {
  it('renders the tenant roster with name fallback', async () => {
    renderPage()
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    // display_name null → login shown as the name (so 'bob' renders in both
    // the name and login cells); login+display_name null → external_id.
    expect(screen.getAllByText('bob')).toHaveLength(2)
    expect(screen.getByText('e3')).toBeInTheDocument()
  })

  it('shows the is_active triplet and never "видалено"', async () => {
    renderPage()
    expect(await screen.findByText('Активний')).toBeInTheDocument()
    expect(screen.getByText('Відкликано')).toBeInTheDocument()
    expect(screen.getByText('Немає доступу до порталу')).toBeInTheDocument()
    expect(screen.queryByText(/видалено/i)).toBeNull()
  })

  it('shows a single-page counter with disabled pagination', async () => {
    renderPage()
    expect(await screen.findByText('Показано 1–3 з 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled()
  })

  it('opens the provision modal with author-language mode labels', async () => {
    renderPage()
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: /Додати студента/ }))
    expect(screen.getByText('Новий студент')).toBeInTheDocument()
    expect(
      screen.getByText('Дати доступ наявному студенту'),
    ).toBeInTheDocument()
  })

  // DD-6-M: VITE_PORTAL_ORIGIN is unset in the test env, so the copy button is
  // disabled with a hint (the dev/empty-origin branch). The happy copy path is
  // covered by live-acceptance.
  it('disables the portal-link button with a hint when origin is unset', async () => {
    renderPage()
    await screen.findByText('Alice')
    const btn = screen.getByRole('button', {
      name: /Скопіювати посилання порталу/,
    })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute(
      'title',
      expect.stringContaining('VITE_PORTAL_ORIGIN'),
    )
  })

  it('links each student row to their submissions page', async () => {
    renderPage()
    await screen.findByText('Alice')
    const links = screen.getAllByRole('link', { name: 'Здачі' })
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', '/students/s1')
    expect(links[1]).toHaveAttribute('href', '/students/s2')
    expect(links[2]).toHaveAttribute('href', '/students/s3')
  })

  // O-3: the mark sits by students who enrolled themselves, and only them.
  it('marks a student who enrolled by the course link', async () => {
    renderPage()
    await screen.findByText('Alice')
    expect(screen.getAllByText('записався сам')).toHaveLength(1)
    const bobRow = screen.getAllByText('bob')[0]!.closest('tr')!
    expect(within(bobRow).getByText('записався сам')).toBeInTheDocument()
  })

  it('marks the self-made enrolment of the student in the list of their courses', async () => {
    vi.mocked(studentsApi.enrollments).mockResolvedValueOnce({
      student_id: 's1',
      items: [
        { course_node_id: 'c-self', enrolled_at: '2026-11-23T10:00:00Z', source: 'self' },
        { course_node_id: 'c-author', enrolled_at: '2026-11-22T10:00:00Z', source: 'author' },
      ],
    })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    const selfItem = (await screen.findByText(/c-self/)).closest('li')!
    const authorItem = screen.getByText(/c-author/).closest('li')!
    expect(within(selfItem).getByText('записався сам')).toBeInTheDocument()
    expect(within(authorItem).queryByText('записався сам')).toBeNull()
  })

  it('links to the students money page', async () => {
    renderPage()
    await screen.findByText('Alice')
    const link = screen.getByRole('link', { name: 'Гроші студентів' })
    expect(link).toHaveAttribute('href', '/students/money')
  })
})
