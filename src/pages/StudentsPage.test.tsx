import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    },
    {
      student_id: 's2',
      external_id: 'e2',
      login: 'bob',
      display_name: null,
      is_active: false,
      enrollment_count: 0,
    },
    {
      student_id: 's3',
      external_id: 'e3',
      login: null,
      display_name: null,
      is_active: null,
      enrollment_count: 1,
    },
  ],
}

beforeEach(() => {
  vi.mocked(studentsApi.list).mockResolvedValue(ROSTER)
})

describe('StudentsPage', () => {
  it('renders the tenant roster with name fallback', async () => {
    render(<StudentsPage />)
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    // display_name null → login shown as the name (so 'bob' renders in both
    // the name and login cells); login+display_name null → external_id.
    expect(screen.getAllByText('bob')).toHaveLength(2)
    expect(screen.getByText('e3')).toBeInTheDocument()
  })

  it('shows the is_active triplet and never "видалено"', async () => {
    render(<StudentsPage />)
    expect(await screen.findByText('Активний')).toBeInTheDocument()
    expect(screen.getByText('Відкликано')).toBeInTheDocument()
    expect(screen.getByText('Немає доступу до порталу')).toBeInTheDocument()
    expect(screen.queryByText(/видалено/i)).toBeNull()
  })

  it('shows a single-page counter with disabled pagination', async () => {
    render(<StudentsPage />)
    expect(await screen.findByText('Показано 1–3 з 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled()
  })

  it('opens the provision modal with author-language mode labels', async () => {
    render(<StudentsPage />)
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: /Додати студента/ }))
    expect(screen.getByText('Новий студент')).toBeInTheDocument()
    expect(
      screen.getByText('Дати доступ наявному студенту'),
    ).toBeInTheDocument()
  })
})
