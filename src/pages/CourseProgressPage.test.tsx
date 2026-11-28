import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CourseProgressPage } from './CourseProgressPage'
import { courseHomeworkApi } from '../api/course-homework'
import { ApiError } from '../api/client'
import type { CourseHomeworkSummary, CourseHomeworkTable } from '../types/api'

vi.mock('../api/course-homework', () => ({
  courseHomeworkApi: {
    summary: vi.fn(),
    students: vi.fn(),
  },
}))

const SUMMARY: CourseHomeworkSummary = {
  course_id: 'course-1',
  course_title: 'Python Basics',
  include_test_students: false,
  excluded_test_students: 3,
  tasks: [
    {
      task_id: 'task-1',
      title: 'Цикли',
      task_type: 'task',
      node_id: 'node-1',
      node_title: 'Тиждень 1',
      students_submitted: 10,
      submissions: 16,
      pass_share: 0.5,
      average_score: 82.5,
      attempts_to_pass: { median: 1.5, mean: 1.8 },
      hardest_criteria: [
        {
          criterion_id: 'c1',
          text: 'Перевірка порожнього списку',
          weight: 'must',
          not_met_students: 4,
          judged_students: 10,
          share: 0.4,
        },
        {
          criterion_id: 'c2',
          text: 'Охайне форматування',
          weight: 'should',
          not_met_students: 3,
          judged_students: 10,
          share: 0.3,
        },
        {
          criterion_id: 'c3',
          text: 'Назви змінних',
          weight: 'should',
          not_met_students: 2,
          judged_students: 10,
          share: 0.2,
        },
      ],
    },
    {
      task_id: 'task-2',
      title: 'Словники',
      task_type: 'short_task',
      node_id: 'node-2',
      node_title: 'Тиждень 2',
      students_submitted: 0,
      submissions: 0,
      pass_share: null,
      average_score: null,
      attempts_to_pass: null,
      hardest_criteria: [],
    },
    {
      task_id: 'task-3',
      title: 'Тест на типи',
      task_type: 'test',
      node_id: 'node-2',
      node_title: 'Тиждень 2',
      students_submitted: 8,
      submissions: 8,
      pass_share: 0.75,
      average_score: 90,
      attempts_to_pass: { median: 1, mean: 1 },
      hardest_criteria: [],
    },
  ],
}

const TABLE: CourseHomeworkTable = {
  course_id: 'course-1',
  course_title: 'Python Basics',
  include_test_students: false,
  excluded_test_students: 2,
  tasks: [
    {
      task_id: 'task-1',
      title: 'Цикли',
      task_type: 'task',
      node_id: 'node-1',
      node_title: 'Тиждень 1',
    },
    {
      task_id: 'task-2',
      title: 'Словники',
      task_type: 'short_task',
      node_id: 'node-2',
      node_title: 'Тиждень 2',
    },
  ],
  students: [
    {
      student_id: 's-1',
      display_name: 'Аліса Коваленко',
      login: 'alice',
      cells: {
        'task-1': {
          state: 'passed',
          best_score: 95,
          attempts: 2,
          last_submitted_at: '2026-11-20T10:00:00Z',
        },
        'task-2': {
          state: 'in_review',
          best_score: null,
          attempts: 0,
          last_submitted_at: '2026-11-21T10:00:00Z',
        },
      },
    },
    {
      student_id: 's-2',
      display_name: null,
      login: 'bob_dev',
      cells: {
        'task-1': {
          state: 'not_passed',
          best_score: 40,
          attempts: 5,
          last_submitted_at: '2026-11-22T10:00:00Z',
        },
        'task-2': {
          state: 'not_submitted',
          best_score: null,
          attempts: 0,
          last_submitted_at: null,
        },
      },
    },
    {
      student_id: 's-3',
      display_name: null,
      login: null,
      cells: {
        'task-1': {
          state: 'not_submitted',
          best_score: null,
          attempts: 0,
          last_submitted_at: null,
        },
        'task-2': {
          state: 'in_review',
          best_score: 60,
          attempts: 1,
          last_submitted_at: '2026-11-23T10:00:00Z',
        },
      },
    },
  ],
  total: 3,
  limit: 500,
  offset: 0,
}

function renderPage(initialEntry = '/course/course-1/progress') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/course/:courseId/progress" element={<CourseProgressPage />} />
        <Route path="/course/:nodeId" element={<div>Course page</div>} />
        <Route path="/students/:studentId" element={<div>Student submissions</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CourseProgressPage', () => {
  it('renders summary with two tasks (with and without submissions) and a test without criteria', async () => {
    vi.mocked(courseHomeworkApi.summary).mockResolvedValue(SUMMARY)
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Успішність курсу — Python Basics' }),
    ).toBeInTheDocument()
    expect(courseHomeworkApi.summary).toHaveBeenCalledWith('course-1', false)

    const task1Row = screen.getByText('Цикли').closest('tr')!
    expect(within(task1Row).getByText('Тиждень 1')).toBeInTheDocument()
    expect(within(task1Row).getByText('10 студентів')).toBeInTheDocument()
    expect(within(task1Row).getByText('16')).toBeInTheDocument()
    expect(within(task1Row).getByText(/50\s*% тих, хто здавав/)).toBeInTheDocument()
    expect(within(task1Row).getByText('82,5')).toBeInTheDocument()
    expect(within(task1Row).getByText('1,5')).toBeInTheDocument()
    expect(
      within(task1Row).getByText(
        'Перевірка порожнього списку — не виконали 4 з 10 (головний)',
      ),
    ).toBeInTheDocument()
    expect(
      within(task1Row).getByText(
        'Охайне форматування — не виконали 3 з 10 (бажаний)',
      ),
    ).toBeInTheDocument()
    expect(
      within(task1Row).getByText('Назви змінних — не виконали 2 з 10 (бажаний)'),
    ).toBeInTheDocument()

    const task2Row = screen.getByText('Словники').closest('tr')!
    expect(within(task2Row).getByText('0 студентів')).toBeInTheDocument()
    expect(within(task2Row).getAllByText('—')).toHaveLength(4)

    const testRow = screen.getByText('Тест на типи').closest('tr')!
    expect(within(testRow).getByText('8 студентів')).toBeInTheDocument()
    expect(within(testRow).getByText(/75\s*% тих, хто здавав/)).toBeInTheDocument()
    expect(within(testRow).getByText('90')).toBeInTheDocument()
    expect(within(testRow).getByText('1')).toBeInTheDocument()
    expect(within(testRow).getAllByText('—')).toHaveLength(1)
  })

  it('renders students table with three students (one unnamed) and all four cell states', async () => {
    vi.mocked(courseHomeworkApi.students).mockResolvedValue(TABLE)
    renderPage('/course/course-1/progress?tab=students')

    const aliceLink = await screen.findByRole('link', { name: 'Аліса Коваленко' })
    expect(aliceLink).toHaveAttribute('href', '/students/s-1')
    expect(aliceLink.closest('th')).toHaveClass('sticky', 'left-0')

    const bobLink = screen.getByRole('link', { name: 'bob_dev' })
    expect(bobLink).toHaveAttribute('href', '/students/s-2')

    const unnamedLink = screen.getByRole('link', { name: 'Студент без імені' })
    expect(unnamedLink).toHaveAttribute('href', '/students/s-3')

    const aliceRow = aliceLink.closest('tr')!
    const passedBadge = within(aliceRow).getByText('зараховано')
    expect(passedBadge).toHaveClass('bg-forest-pale', 'text-forest')
    expect(within(aliceRow).getByText('бал 95 · 2 спроби')).toBeInTheDocument()
    const inReviewBadge = within(aliceRow).getByText('перевіряється')
    expect(inReviewBadge).toHaveClass('bg-amber-pale', 'text-amber-dark')

    const bobRow = bobLink.closest('tr')!
    const notPassedBadge = within(bobRow).getByText('не зараховано')
    expect(notPassedBadge).toHaveClass('bg-coral-pale', 'text-coral')
    expect(within(bobRow).getByText('бал 40 · 5 спроб')).toBeInTheDocument()
    expect(within(bobRow).getByText('—')).toBeInTheDocument()

    const unnamedRow = unnamedLink.closest('tr')!
    expect(within(unnamedRow).getByText('перевіряється')).toBeInTheDocument()
    expect(within(unnamedRow).getByText('бал 60 · 1 спроба')).toBeInTheDocument()
    expect(within(unnamedRow).getByText('—')).toBeInTheDocument()
  })

  it('switches tabs and toggles include_test_students with excluded note', async () => {
    vi.mocked(courseHomeworkApi.summary)
      .mockResolvedValueOnce(SUMMARY)
      .mockResolvedValueOnce({
        ...SUMMARY,
        include_test_students: true,
        excluded_test_students: 0,
      })
    vi.mocked(courseHomeworkApi.students).mockResolvedValue({
      ...TABLE,
      include_test_students: true,
      excluded_test_students: 0,
    })

    renderPage()

    expect(
      await screen.findByText('Службових студентів не враховано: 3.'),
    ).toBeInTheDocument()

    const checkbox = screen.getByRole('checkbox', {
      name: 'Враховувати службових студентів',
    })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(courseHomeworkApi.summary).toHaveBeenLastCalledWith('course-1', true)
    })
    expect(
      screen.queryByText('Службових студентів не враховано: 3.'),
    ).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'За студентами' }))
    await waitFor(() => {
      expect(courseHomeworkApi.students).toHaveBeenCalledWith('course-1', {
        includeTestStudents: true,
        limit: 500,
        offset: 0,
      })
    })
  })

  it('paginates students table when total is 620 and limit is 500', async () => {
    vi.mocked(courseHomeworkApi.students)
      .mockResolvedValueOnce({
        ...TABLE,
        total: 620,
        limit: 500,
        offset: 0,
      })
      .mockResolvedValueOnce({
        ...TABLE,
        total: 620,
        limit: 500,
        offset: 500,
      })

    renderPage('/course/course-1/progress?tab=students')

    expect(await screen.findByText('Показано 1–3 з 620')).toBeInTheDocument()
    const nextBtn = screen.getByRole('button', { name: 'Далі' })
    expect(nextBtn).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()

    fireEvent.click(nextBtn)
    await waitFor(() => {
      expect(courseHomeworkApi.students).toHaveBeenLastCalledWith('course-1', {
        includeTestStudents: false,
        limit: 500,
        offset: 500,
      })
    })
  })

  it('shows empty state when response has no submissions', async () => {
    vi.mocked(courseHomeworkApi.summary).mockResolvedValue({
      ...SUMMARY,
      tasks: [],
    })
    renderPage()

    expect(
      await screen.findByText('На завдання цього курсу ще ніхто не подавав робіт.'),
    ).toBeInTheDocument()
  })

  it('shows error state with retry on 500 and not-found state on 404', async () => {
    vi.mocked(courseHomeworkApi.summary)
      .mockRejectedValueOnce(new ApiError(500, 'Server error'))
      .mockResolvedValueOnce(SUMMARY)

    renderPage()

    expect(
      await screen.findByText('Не вдалося завантажити дані. Спробуйте ще раз.'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))
    expect(
      await screen.findByRole('heading', { name: 'Успішність курсу — Python Basics' }),
    ).toBeInTheDocument()

    vi.mocked(courseHomeworkApi.summary).mockRejectedValueOnce(
      new ApiError(404, 'Course not found.'),
    )
    renderPage('/course/missing-course/progress')
    expect(await screen.findByText('Курс не знайдено.')).toBeInTheDocument()
  })
})
