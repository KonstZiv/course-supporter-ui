import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StudentSubmissionsPage } from './StudentSubmissionsPage'
import { studentsApi } from '../api/students'
import { ApiError } from '../api/client'
import type { AuthorStudentSubmissions, AuthorSubmissionListItem } from '../types/api'

vi.mock('../api/students', () => ({
  studentsApi: {
    submissions: vi.fn(),
  },
}))

function makeItem(
  overrides: Partial<AuthorSubmissionListItem> = {},
): AuthorSubmissionListItem {
  return {
    id: 'sub-1',
    attempt_no: 1,
    previous_submission_id: null,
    created_at: '2026-11-10T12:00:00Z',
    reviewed_at: '2026-11-11T12:00:00Z',
    course_id: 'c-1',
    course_title: 'Python Basics',
    task_document_id: 't-1',
    task_title: 'Loops HW',
    task_type: 'task',
    status: 'delivered',
    presentation: { state: 'reviewed', reason_code: null },
    score: 90,
    rejection: null,
    not_opened: [],
    recovered_encoding: 'utf-8',
    is_repeat_copy: false,
    review_language: 'ukr',
    original_filename: 'main.py',
    passed: true,
    ...overrides,
  }
}

const RESPONSE: AuthorStudentSubmissions = {
  student: {
    student_id: 's1',
    display_name: 'Alice',
    login: 'alice',
  },
  enrollments: [
    {
      course_id: 'c-1',
      course_title: 'Python Basics',
      enrolled_at: '2026-10-01T10:00:00Z',
    },
    {
      course_id: 'c-2',
      course_title: 'Algorithms',
      enrolled_at: '2026-10-15T10:00:00Z',
    },
  ],
  items: [
    makeItem(),
    makeItem({
      id: 'sub-2',
      task_title: 'Sorting',
      course_id: 'c-2',
      course_title: 'Algorithms',
      attempt_no: null,
      reviewed_at: null,
      presentation: { state: 'awaiting_funds', reason_code: 'awaiting_author_funds' },
      score: null,
      passed: null,
      is_repeat_copy: true,
      rejection: { code: 'off_task', details: null },
    }),
  ],
  total: 2,
  limit: 20,
  offset: 0,
}

function renderPage(initialEntry = '/students/s1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/students/:studentId" element={<StudentSubmissionsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StudentSubmissionsPage', () => {
  it('renders header, enrollments, rows, repeat/rejected badges, and presentation state', async () => {
    vi.mocked(studentsApi.submissions).mockResolvedValue(RESPONSE)
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Записаний на курси:')).toBeInTheDocument()
    expect(screen.getByText(/Python Basics — з/)).toBeInTheDocument()
    expect(screen.getByText(/Algorithms — з/)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Loops HW' })
    expect(link).toHaveAttribute('href', '/students/s1/submissions/sub-1')
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getByText('Так')).toBeInTheDocument()

    expect(screen.getByText('повтор без змін')).toBeInTheDocument()
    expect(screen.getByText('відхилено')).toBeInTheDocument()
    expect(screen.getByText('чекає ваших юнітів')).toBeInTheDocument()
    expect(screen.getByText('Показано 1–2 з 2')).toBeInTheDocument()
  })

  it('renders all non-reviewed presentation states in words', async () => {
    vi.mocked(studentsApi.submissions).mockResolvedValue({
      ...RESPONSE,
      total: 4,
      items: [
        makeItem({ id: 'a1', reviewed_at: null, presentation: { state: 'in_progress' } }),
        makeItem({ id: 'a2', reviewed_at: null, presentation: { state: 'awaiting_funds', reason_code: 'awaiting_funds' } }),
        makeItem({ id: 'a3', reviewed_at: null, presentation: { state: 'not_opened' } }),
        makeItem({ id: 'a4', reviewed_at: null, presentation: { state: 'not_an_attempt' } }),
      ],
    })
    renderPage()

    expect(await screen.findByText('перевіряється')).toBeInTheDocument()
    expect(screen.getByText('чекає юнітів студента')).toBeInTheDocument()
    expect(screen.getByText('файл не вдалося відкрити')).toBeInTheDocument()
    expect(screen.getByText('не схоже на спробу')).toBeInTheDocument()
  })

  it('changes request when course filter changes', async () => {
    vi.mocked(studentsApi.submissions).mockResolvedValue(RESPONSE)
    renderPage()

    const select = await screen.findByRole('combobox')
    fireEvent.change(select, { target: { value: 'c-2' } })

    expect(studentsApi.submissions).toHaveBeenLastCalledWith('s1', {
      courseNodeId: 'c-2',
      limit: 20,
      offset: 0,
    })
  })

  it('paginates with Next and Prev buttons', async () => {
    vi.mocked(studentsApi.submissions).mockResolvedValue({
      ...RESPONSE,
      total: 25,
    })
    renderPage()

    const nextBtn = await screen.findByRole('button', { name: 'Далі' })
    expect(nextBtn).not.toBeDisabled()
    fireEvent.click(nextBtn)

    expect(studentsApi.submissions).toHaveBeenLastCalledWith('s1', {
      courseNodeId: undefined,
      limit: 20,
      offset: 20,
    })
  })

  it('shows empty state when student has no submissions', async () => {
    vi.mocked(studentsApi.submissions).mockResolvedValue({
      ...RESPONSE,
      items: [],
      total: 0,
    })
    renderPage()
    expect(
      await screen.findByText('Студент ще не здав жодної роботи.'),
    ).toBeInTheDocument()
  })

  it('shows notFound on 404', async () => {
    vi.mocked(studentsApi.submissions).mockRejectedValue(
      new ApiError(404, 'Not found'),
    )
    renderPage()
    expect(await screen.findByText('Студента не знайдено.')).toBeInTheDocument()
  })

  it('shows loadFailed with retry button on non-404 error', async () => {
    vi.mocked(studentsApi.submissions).mockRejectedValueOnce(new Error('Network'))
    renderPage()

    expect(
      await screen.findByText('Не вдалося завантажити здачі. Спробуйте ще раз.'),
    ).toBeInTheDocument()

    vi.mocked(studentsApi.submissions).mockResolvedValueOnce(RESPONSE)
    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))
    expect(await screen.findByRole('heading', { name: 'Alice' })).toBeInTheDocument()
  })
})
