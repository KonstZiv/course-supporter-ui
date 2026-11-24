import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { StudentSubmissionPage } from './StudentSubmissionPage'
import { studentsApi } from '../api/students'
import { ApiError } from '../api/client'
import type { AuthorSubmissionDetail } from '../types/api'

vi.mock('../api/students', () => ({
  studentsApi: {
    submission: vi.fn(),
    submissionFile: vi.fn(),
  },
}))

vi.mock('../utils/languages', () => ({
  findLanguage: vi.fn((code: string | null | undefined) =>
    code === 'ukr' ? { code: 'ukr', name_en: 'Ukrainian', name_native: 'Українська' } : null,
  ),
}))

function makeDetail(
  overrides: Partial<AuthorSubmissionDetail> = {},
): AuthorSubmissionDetail {
  return {
    id: 'sub-2',
    attempt_no: 2,
    previous_submission_id: 'sub-1',
    created_at: '2026-11-10T12:00:00Z',
    reviewed_at: '2026-11-11T12:00:00Z',
    course_id: 'c-1',
    course_title: 'Python Basics',
    task_document_id: 't-1',
    task_title: 'Loops HW',
    task_type: 'task',
    status: 'delivered',
    presentation: { state: 'reviewed', reason_code: null },
    score: 85,
    rejection: null,
    not_opened: [],
    recovered_encoding: 'utf-8',
    is_repeat_copy: false,
    review_language: 'ukr',
    original_filename: 'main.py',
    student: { student_id: 's1', display_name: 'Alice' },
    verdict: { passed: true, correctness: 'correct' },
    structure: null,
    review_markdown: '## Good job\n\nAll **tests** passed.',
    delta: null,
    own_feedback: { kind: 'touch', value: 'helped', updated_at: '2026-11-12T12:00:00Z' },
    pass_rule: { basis: 'author_musts_met', threshold: 70, required_musts: 2 },
    criteria: [
      {
        item_id: 'c1',
        item_kind: 'criterion',
        text: 'Handles edge cases',
        weight: 'must',
        must_by_author: true,
        verdict: 'met',
        quote: 'if not items: return []',
        quote_line_start: 3,
        missing: null,
        remark_state: 'fixed',
      },
      {
        item_id: 'c1.p1',
        item_kind: 'point',
        text: 'Empty list returns []',
        weight: null,
        must_by_author: false,
        verdict: 'not_met',
        quote: null,
        quote_line_start: null,
        missing: 'Missing empty input guard',
        remark_state: 'new',
      },
      {
        item_id: 'c2',
        item_kind: 'criterion',
        text: 'Clean naming',
        weight: 'should',
        must_by_author: false,
        verdict: 'unconfirmed',
        quote: null,
        quote_line_start: null,
        missing: null,
        remark_state: null,
      },
    ],
    ...overrides,
  }
}

function renderPage(initialEntry = '/students/s1/submissions/sub-2') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/students/:studentId/submissions/:submissionId"
          element={<StudentSubmissionPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('StudentSubmissionPage', () => {
  it('renders header, buttons, score, verdict, pass_rule with musts, criteria breakdown, markdown review, and feedback', async () => {
    vi.mocked(studentsApi.submission).mockResolvedValue(makeDetail())
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Loops HW · Python Basics' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Спроба 2')).toBeInTheDocument()
    expect(screen.getByText('Мова рецензії: Ukrainian')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: '← Здачі студента' })).toHaveAttribute(
      'href',
      '/students/s1',
    )
    expect(screen.getByRole('button', { name: 'Завантажити роботу' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Критерії завдання' })).toHaveAttribute(
      'href',
      '/task/t-1/criteria',
    )
    expect(screen.getByRole('link', { name: 'Попередня спроба' })).toHaveAttribute(
      'href',
      '/students/s1/submissions/sub-1',
    )

    expect(screen.getByText('Бал: 85')).toBeInTheDocument()
    expect(screen.getByText('Зараховано')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Залік: виконано кожен критерій, обов'язковий для заліку (2), і бал не менший за 70.",
      ),
    ).toBeInTheDocument()

    expect(screen.getByText('Розбір за критеріями')).toBeInTheDocument()
    expect(screen.getByText('головний')).toBeInTheDocument()
    expect(screen.getByText("Обов'язковий для заліку")).toBeInTheDocument()
    expect(screen.getByText('Виконано')).toBeInTheDocument()
    expect(screen.getByText('Цитата з роботи')).toBeInTheDocument()
    expect(screen.getByText('if not items: return []')).toBeInTheDocument()
    expect(screen.getByText('виправлено')).toBeInTheDocument()

    expect(screen.getByText('пункт')).toBeInTheDocument()
    expect(screen.getByText('Не виконано')).toBeInTheDocument()
    expect(screen.getByText('Чого бракує')).toBeInTheDocument()
    expect(screen.getByText('Missing empty input guard')).toBeInTheDocument()
    expect(screen.getByText('нове зауваження')).toBeInTheDocument()

    expect(screen.getByText('бажаний')).toBeInTheDocument()
    expect(screen.getByText('Не підтверджено')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Good job' })).toBeInTheDocument()
    expect(
      screen.getByText('Студент позначив: рецензія допомогла.'),
    ).toBeInTheDocument()
  })

  it('hides download and criteria buttons for test submissions and previous button when null', async () => {
    vi.mocked(studentsApi.submission).mockResolvedValue(
      makeDetail({
        task_type: 'test',
        previous_submission_id: null,
        verdict: { passed: false, correctness: 'incorrect' },
        pass_rule: { basis: 'no_author_musts_failed', threshold: 80, required_musts: 0 },
        criteria: [],
        review_markdown: null,
        own_feedback: { kind: 'touch', value: 'not_helped', updated_at: '2026-11-12T12:00:00Z' },
      }),
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Loops HW · Python Basics' })
    expect(screen.queryByRole('button', { name: 'Завантажити роботу' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Критерії завдання' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Попередня спроба' })).toBeNull()

    expect(screen.getByText('Не зараховано')).toBeInTheDocument()
    expect(
      screen.getByText('Залік: бал не менший за 80.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Розбір за критеріями')).toBeNull()
    expect(screen.getByText('Рецензії ще немає.')).toBeInTheDocument()
    expect(
      screen.getByText('Студент позначив: рецензія не допомогла.'),
    ).toBeInTheDocument()
  })

  it('omits pass_rule line when pass_rule is null and handles download success and failure', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.mocked(studentsApi.submission).mockResolvedValue(
      makeDetail({ pass_rule: null }),
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Loops HW · Python Basics' })
    expect(screen.queryByText(/Залік:/)).toBeNull()

    vi.mocked(studentsApi.submissionFile).mockResolvedValueOnce({
      url: 'https://files.example.com/work.py',
      expires_at: '2026-11-12T12:15:00Z',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Завантажити роботу' }))
    await vi.waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        'https://files.example.com/work.py',
        '_blank',
        'noopener,noreferrer',
      )
    })

    vi.mocked(studentsApi.submissionFile).mockRejectedValueOnce(new Error('fail'))
    fireEvent.click(screen.getByRole('button', { name: 'Завантажити роботу' }))
    expect(
      await screen.findByText('Не вдалося отримати файл. Спробуйте ще раз.'),
    ).toBeInTheDocument()

    openSpy.mockRestore()
  })

  it('shows notFound on 404 and loadFailed with retry on other errors', async () => {
    vi.mocked(studentsApi.submission).mockRejectedValueOnce(
      new ApiError(404, 'Not found'),
    )
    renderPage()
    expect(await screen.findByText('Здачу не знайдено.')).toBeInTheDocument()

    vi.mocked(studentsApi.submission).mockRejectedValueOnce(new Error('Network'))
    renderPage('/students/s1/submissions/sub-3')
    expect(
      await screen.findByText('Не вдалося завантажити здачу. Спробуйте ще раз.'),
    ).toBeInTheDocument()
  })
})
