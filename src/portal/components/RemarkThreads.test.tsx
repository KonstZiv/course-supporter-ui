import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { RemarkThreads } from './RemarkThreads'
import { portalApi, PortalApiError } from '../api/portalClient'
import type {
  RemarkComment,
  RemarkThreads as RemarkThreadsType,
  ReviewStructureV1,
} from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      remarkThreads: vi.fn(),
      replyToRemark: vi.fn(),
    },
  }
})

const mockedRemarkThreads = vi.mocked(portalApi.remarkThreads)
const mockedReplyToRemark = vi.mocked(portalApi.replyToRemark)

const makeStructure = (over: Partial<ReviewStructureV1> = {}): ReviewStructureV1 => ({
  schema_version: '1',
  language: 'uk',
  verdict: null,
  test: null,
  fixed: [],
  new_remarks: [],
  open: [],
  broken: [],
  mentor_voice: null,
  replies: [],
  verification: null,
  progress: null,
  ...over,
})

describe('RemarkThreads — visibility conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render and makes no network call when structure is null', () => {
    const { container } = render(
      <RemarkThreads submissionId="sub-1" structure={null} />,
    )
    expect(container.firstChild).toBeNull()
    expect(mockedRemarkThreads).not.toHaveBeenCalled()
  })

  it('does not render and makes no call when no remarks have item_id', () => {
    const structure = makeStructure({
      new_remarks: [
        {
          what: 'Щось не так',
          why: 'Чому це важливо',
          todo: 'Як виправити',
          read: [],
          position: null,
          item_id: null,
        },
      ],
    })
    const { container } = render(
      <RemarkThreads submissionId="sub-1" structure={structure} />,
    )
    expect(container.firstChild).toBeNull()
    expect(mockedRemarkThreads).not.toHaveBeenCalled()
  })

  it('does not render when accepting_replies is false and threads have no comments', async () => {
    const structure = makeStructure({
      new_remarks: [
        {
          what: 'Щось не так',
          why: 'Чому це важливо',
          todo: 'Як виправити',
          read: [],
          position: null,
          item_id: 'c1',
        },
      ],
    })
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: false,
      threads: [{ item_id: 'c1', comments: [] }],
    })

    const { container } = render(
      <RemarkThreads submissionId="sub-1" structure={structure} />,
    )

    await waitFor(() => {
      expect(mockedRemarkThreads).toHaveBeenCalledWith('sub-1')
    })
    expect(container.firstChild).toBeNull()
  })

  it('does not show error or crash if remarkThreads fails', async () => {
    const structure = makeStructure({
      new_remarks: [
        {
          what: 'Щось не так',
          why: 'Чому це важливо',
          todo: 'Як виправити',
          read: [],
          position: null,
          item_id: 'c1',
        },
      ],
    })
    mockedRemarkThreads.mockRejectedValueOnce(
      new PortalApiError(500, 'portal api 500'),
    )

    const { container } = render(
      <RemarkThreads submissionId="sub-1" structure={structure} />,
    )

    await waitFor(() => {
      expect(mockedRemarkThreads).toHaveBeenCalled()
    })
    expect(container.firstChild).toBeNull()
  })
})

describe('RemarkThreads — display and nesting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const sampleStructure = makeStructure({
    new_remarks: [
      {
        what: 'Перше речення зауваження. Друге речення.',
        why: 'Чому',
        todo: 'Що робити',
        read: [],
        position: null,
        item_id: 'c1',
      },
    ],
    open: [
      {
        what: 'Зауваження, яке лишилося відкритим.',
        why: 'Чому',
        todo: 'Що робити',
        read: [],
        position: null,
        item_id: 'c2',
      },
    ],
  })

  it('renders section badges, remark snippets, and threads in section order', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'student',
              kind: 'question',
              body: 'Чи правильно я зрозумів умову?',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
            {
              id: 'comm-2',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: 'comm-1',
              author: 'mentor',
              kind: 'answer',
              body: 'Так, але зверніть увагу на граничні випадки.',
              created_at: '2026-11-17T12:30:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(<RemarkThreads submissionId="sub-1" structure={sampleStructure} />)

    await waitFor(() => {
      expect(screen.getByText('Репліки до зауважень')).toBeInTheDocument()
    })

    // Section badges
    expect(screen.getByText('Нове')).toBeInTheDocument()
    expect(screen.getByText('Лишилося відкритим')).toBeInTheDocument()

    // Remark snippet - first sentence only
    expect(
      screen.getByText('Перше речення зауваження.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Друге речення.'),
    ).not.toBeInTheDocument()

    // Thread comments
    expect(screen.getByText('Ви')).toBeInTheDocument()
    expect(screen.getByText('Питання')).toBeInTheDocument()
    expect(
      screen.getByText('Чи правильно я зрозумів умову?'),
    ).toBeInTheDocument()

    expect(screen.getByText('Ментор')).toBeInTheDocument()
    expect(screen.getByText('Відповідь')).toBeInTheDocument()
    expect(
      screen.getByText('Так, але зверніть увагу на граничні випадки.'),
    ).toBeInTheDocument()
  })

  it('renders student text literally without HTML or Markdown formatting', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'student',
              kind: 'comment',
              body: '<b>тег</b> та **зірочки**',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(<RemarkThreads submissionId="sub-1" structure={sampleStructure} />)

    await waitFor(() => {
      expect(
        screen.getByText('<b>тег</b> та **зірочки**'),
      ).toBeInTheDocument()
    })
    // <b> is not an HTML element in DOM
    expect(document.querySelector('b')).toBeNull()
  })

  it('renders mentor text formatted via MarkdownContent', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-2',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'mentor',
              kind: 'answer',
              body: 'Тут є **жирний текст**',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(<RemarkThreads submissionId="sub-1" structure={sampleStructure} />)

    await waitFor(() => {
      expect(screen.getByText('жирний текст')).toBeInTheDocument()
    })
    expect(document.querySelector('strong')).toBeInTheDocument()
  })

  it('shows waiting mark for student reply without mentor answer', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'student',
              kind: 'question',
              body: 'Моє питання',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(<RemarkThreads submissionId="sub-1" structure={sampleStructure} />)

    await waitFor(() => {
      expect(
        screen.getByText('чекає відповіді в наступній рецензії'),
      ).toBeInTheDocument()
    })
  })

  it('does not show waiting mark once mentor has answered it with matching parent_id', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'student',
              kind: 'question',
              body: 'Моє питання',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
            {
              id: 'comm-2',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: 'comm-1',
              author: 'mentor',
              kind: 'answer',
              body: 'Моя відповідь',
              created_at: '2026-11-17T12:10:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(<RemarkThreads submissionId="sub-1" structure={sampleStructure} />)

    await waitFor(() => {
      expect(screen.getByText('Моя відповідь')).toBeInTheDocument()
    })
    expect(
      screen.queryByText('чекає відповіді в наступній рецензії'),
    ).not.toBeInTheDocument()
  })

  it('when accepting_replies is false with threads: shows threads, notice of previous attempt, and no reply buttons', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: false,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'student',
              kind: 'question',
              body: 'Старе питання',
              created_at: '2026-11-16T12:00:00Z',
              answered_in_submission_id: 'sub-2',
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(<RemarkThreads submissionId="sub-1" structure={sampleStructure} />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'До цієї рецензії репліки вже не приймаються: є новіша рецензія або завдання змінилося.',
        ),
      ).toBeInTheDocument()
    })

    expect(screen.getByText('Старе питання')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /відповісти/i }),
    ).not.toBeInTheDocument()
  })

  it('renders English words for replies when language is en', async () => {
    const threads: RemarkThreadsType = {
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'student',
              kind: 'question',
              body: 'My question in English',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    }

    mockedRemarkThreads.mockResolvedValueOnce(threads)

    render(
      <LanguageProvider language="en">
        <RemarkThreads submissionId="sub-1" structure={sampleStructure} />
      </LanguageProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Replies to remarks')).toBeInTheDocument()
    })

    expect(screen.getByText('New')).toBeInTheDocument()
    expect(screen.getByText('Still open')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('Question')).toBeInTheDocument()
    expect(
      screen.getByText('waiting for an answer in the next review'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Reply' }).length).toBeGreaterThan(0)
  })
})

describe('RemarkThreads — reply submission and refusals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const structure = makeStructure({
    new_remarks: [
      {
        what: 'Зауваження 1',
        why: 'Чому 1',
        todo: 'Що робити 1',
        read: [],
        position: null,
        item_id: 'c1',
      },
    ],
  })

  it('submits a reply successfully, updates thread, closes form, and shows confirmation sentence', async () => {
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: true,
      threads: [],
    })

    render(<RemarkThreads submissionId="sub-1" structure={structure} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /відповісти/i }),
      ).toBeInTheDocument()
    })

    // Open form
    fireEvent.click(screen.getByRole('button', { name: /відповісти/i }))

    expect(
      screen.getByText('Реплік до цього зауваження: 0 з 5.'),
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', {
      name: /надіслати репліку/i,
    })
    expect(submitBtn).toBeDisabled()

    // Select kind
    const select = screen.getByLabelText('Вид репліки')
    fireEvent.change(select, { target: { value: 'objection' } })

    // Type text
    const textarea = screen.getByPlaceholderText(
      'Напишіть, із чим не згодні або що незрозуміло',
    )
    fireEvent.change(textarea, { target: { value: 'Я не згоден з цим.' } })

    expect(submitBtn).not.toBeDisabled()

    const newComment: RemarkComment = {
      id: 'comm-new',
      submission_id: 'sub-1',
      item_id: 'c1',
      parent_id: null,
      author: 'student',
      kind: 'objection',
      body: 'Я не згоден з цим.',
      created_at: '2026-11-17T15:00:00Z',
      answered_in_submission_id: null,
    }

    mockedReplyToRemark.mockResolvedValueOnce(newComment)

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockedReplyToRemark).toHaveBeenCalledWith('sub-1', {
        item_id: 'c1',
        kind: 'objection',
        body: 'Я не згоден з цим.',
        parent_id: null,
      })
    })

    // Thread updated
    await waitFor(() => {
      expect(screen.getByText('Я не згоден з цим.')).toBeInTheDocument()
      expect(screen.getByText('Заперечення')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Репліку збережено. Відповідь прийде з рецензією на наступну подачу.',
        ),
      ).toBeInTheDocument()
    })

    // Form closed
    expect(
      screen.queryByPlaceholderText(
        'Напишіть, із чим не згодні або що незрозуміло',
      ),
    ).not.toBeInTheDocument()
  })

  it('allows replying directly to a Mentor comment and passes parent_id', async () => {
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-mentor-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'mentor',
              kind: 'answer',
              body: 'Пояснення Ментора',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    })

    render(<RemarkThreads submissionId="sub-1" structure={structure} />)

    await waitFor(() => {
      expect(screen.getByText('Пояснення Ментора')).toBeInTheDocument()
    })

    // Click reply next to mentor comment
    const replyButtons = screen.getAllByRole('button', { name: /відповісти/i })
    expect(replyButtons.length).toBeGreaterThanOrEqual(2)
    const mentorReplyBtn = replyButtons[0]
    expect(mentorReplyBtn).toBeDefined()
    if (!mentorReplyBtn) throw new Error('Button not found')
    fireEvent.click(mentorReplyBtn)

    const textarea = screen.getByPlaceholderText(
      'Напишіть, із чим не згодні або що незрозуміло',
    )
    fireEvent.change(textarea, { target: { value: 'Уточнення до відповіді.' } })

    mockedReplyToRemark.mockResolvedValueOnce({
      id: 'comm-child-1',
      submission_id: 'sub-1',
      item_id: 'c1',
      parent_id: 'comm-mentor-1',
      author: 'student',
      kind: 'question',
      body: 'Уточнення до відповіді.',
      created_at: '2026-11-17T13:00:00Z',
      answered_in_submission_id: null,
    })

    fireEvent.click(
      screen.getByRole('button', { name: /надіслати репліку/i }),
    )

    await waitFor(() => {
      expect(mockedReplyToRemark).toHaveBeenCalledWith('sub-1', {
        item_id: 'c1',
        kind: 'question',
        body: 'Уточнення до відповіді.',
        parent_id: 'comm-mentor-1',
      })
    })
  })

  it('hides reply buttons when 5 student replies are reached for this submission', async () => {
    const studentComments: RemarkComment[] = Array.from({ length: 5 }, (_, i) => ({
      id: `comm-s-${i}`,
      submission_id: 'sub-1',
      item_id: 'c1',
      parent_id: null,
      author: 'student',
      kind: 'question',
      body: `Питання ${i + 1}`,
      created_at: `2026-11-17T1${i}:00:00Z`,
      answered_in_submission_id: null,
    }))

    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: true,
      threads: [{ item_id: 'c1', comments: studentComments }],
    })

    render(<RemarkThreads submissionId="sub-1" structure={structure} />)

    await waitFor(() => {
      expect(screen.getByText('Питання 5')).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('button', { name: /відповісти/i }),
    ).not.toBeInTheDocument()
  })

  // Test all 7 refusal codes individually
  it.each([
    [
      'not_latest_review',
      {},
      'Ця рецензія вже не остання — відповідати можна на зауваження останньої рецензії. Оновіть сторінку.',
      true, // triggers refetch
    ],
    [
      'unknown_item',
      {},
      'Цього зауваження в рецензії вже немає. Оновіть сторінку.',
      true,
    ],
    [
      'parent_not_in_thread',
      {},
      'Коментар, на який ви відповідаєте, не з цієї гілки. Оновіть сторінку й спробуйте ще раз.',
      true,
    ],
    [
      'comment_limit_reached',
      { max: 5 },
      'До цього зауваження вже є 5 ваших реплік. Наступні можна буде написати до рецензії наступної подачі.',
      false,
    ],
    [
      'comment_empty',
      {},
      'Репліка порожня. Напишіть текст і надішліть знову.',
      false,
    ],
    [
      'comment_too_long',
      { max: 2000 },
      'Репліка задовга — максимум 2\u00a0000 знаків. Скоротіть її й надішліть знову.',
      false,
    ],
    [
      'comment_rejected',
      { category: 'suspicious_unicode' },
      'Репліку не прийнято: у ній є приховані чи підмінені символи. Такі символи часто приносить текст, скопійований з іншої програми, і деякі емодзі. Приберіть їх і надішліть знову.',
      false,
    ],
  ])(
    'displays correct sentence on %s refusal and preserves field text',
    async (code, details, expectedPhrase, shouldRefetch) => {
      mockedRemarkThreads.mockResolvedValueOnce({
        accepting_replies: true,
        threads: [],
      })

      render(<RemarkThreads submissionId="sub-1" structure={structure} />)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /відповісти/i }),
        ).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /відповісти/i }))

      const textarea = screen.getByPlaceholderText(
        'Напишіть, із чим не згодні або що незрозуміло',
      )
      fireEvent.change(textarea, { target: { value: 'Мій набраний текст' } })

      mockedReplyToRemark.mockRejectedValueOnce(
        new PortalApiError(422, 'portal api 422', {
          detail: { code, details },
        }),
      )

      if (shouldRefetch) {
        mockedRemarkThreads.mockResolvedValueOnce({
          accepting_replies: true,
          threads: [],
        })
      }

      fireEvent.click(
        screen.getByRole('button', { name: /надіслати репліку/i }),
      )

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(
          new RegExp(expectedPhrase.replace(/\u00a0/g, '[\\s\\u00a0]')),
        )
      })

      // Field text is preserved
      expect(textarea).toHaveValue('Мій набраний текст')

      if (shouldRefetch) {
        expect(mockedRemarkThreads).toHaveBeenCalledTimes(2)
      }
    },
  )

  it('keeps refusal reason and card on screen after not_latest_review when refetched threads has accepting_replies false, disables submit, and cancel closes form', async () => {
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: true,
      threads: [],
    })

    render(<RemarkThreads submissionId="sub-1" structure={structure} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /відповісти/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /відповісти/i }))

    const textarea = screen.getByPlaceholderText(
      'Напишіть, із чим не згодні або що незрозуміло',
    )
    fireEvent.change(textarea, { target: { value: 'Мій набраний текст' } })

    mockedReplyToRemark.mockRejectedValueOnce(
      new PortalApiError(422, 'portal api 422', {
        detail: { code: 'not_latest_review', details: {} },
      }),
    )

    // Re-fetched threads answer with accepting_replies: false and no comments
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: false,
      threads: [],
    })

    const submitBtn = screen.getByRole('button', {
      name: /надіслати репліку/i,
    })
    fireEvent.click(submitBtn)

    // The error reason stays on screen
    await waitFor(() => {
      expect(
        screen.getByText(
          'Ця рецензія вже не остання — відповідати можна на зауваження останньої рецензії. Оновіть сторінку.',
        ),
      ).toBeInTheDocument()
    })

    // The remark card and form are still on screen
    expect(screen.getByText('Зауваження 1')).toBeInTheDocument()
    expect(textarea).toBeInTheDocument()

    // Submit button is disabled because accepting_replies is now false
    expect(submitBtn).toBeDisabled()

    // Clicking "Скасувати" closes the form
    const cancelBtn = screen.getByRole('button', { name: /скасувати/i })
    fireEvent.click(cancelBtn)

    // Now standard rules apply: accepting_replies is false and no comments, so block hides
    await waitFor(() => {
      expect(screen.queryByText('Зауваження 1')).not.toBeInTheDocument()
    })
  })

  it('links the error message to the textarea via aria-describedby', async () => {
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: true,
      threads: [],
    })

    render(<RemarkThreads submissionId="sub-1" structure={structure} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /відповісти/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /відповісти/i }))

    const textarea = screen.getByPlaceholderText(
      'Напишіть, із чим не згодні або що незрозуміло',
    )

    // Before error: only counter in aria-describedby
    const descBefore = textarea.getAttribute('aria-describedby') || ''
    expect(descBefore).toMatch(/-c1-counter$/)

    fireEvent.change(textarea, { target: { value: 'Тестовий текст' } })

    mockedReplyToRemark.mockRejectedValueOnce(
      new PortalApiError(422, 'portal api 422', {
        detail: { code: 'comment_rejected', details: {} },
      }),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /надіслати репліку/i }),
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    const errorBlock = screen.getByRole('alert')
    expect(errorBlock.id).toBeTruthy()
    const descAfter = textarea.getAttribute('aria-describedby') || ''
    expect(descAfter).toContain(errorBlock.id)
    expect(descAfter).toContain(descBefore)
  })

  it('shows mentor comment context above textarea when replying to mentor, and hides it when replying via bottom button', async () => {
    mockedRemarkThreads.mockResolvedValueOnce({
      accepting_replies: true,
      threads: [
        {
          item_id: 'c1',
          comments: [
            {
              id: 'comm-mentor-1',
              submission_id: 'sub-1',
              item_id: 'c1',
              parent_id: null,
              author: 'mentor',
              kind: 'answer',
              body: 'Відповідь Ментора',
              created_at: '2026-11-17T12:00:00Z',
              answered_in_submission_id: null,
            },
          ],
        },
      ],
    })

    render(<RemarkThreads submissionId="sub-1" structure={structure} />)

    await waitFor(() => {
      expect(screen.getByText('Відповідь Ментора')).toBeInTheDocument()
    })

    // Click mentor reply button (has parent_id)
    const replyButtons = screen.getAllByRole('button', { name: /відповісти/i })
    expect(replyButtons[0]).toBeDefined()
    fireEvent.click(replyButtons[0]!)

    expect(
      screen.getByText(/Відповідь на коментар Ментора від/),
    ).toBeInTheDocument()

    // Cancel form
    fireEvent.click(screen.getByRole('button', { name: /скасувати/i }))
    expect(
      screen.queryByText(/Відповідь на коментар Ментора від/),
    ).not.toBeInTheDocument()

    // Open via bottom reply button
    const buttonsAfterCancel = screen.getAllByRole('button', { name: /відповісти/i })
    const bottomReplyBtn = buttonsAfterCancel[1]
    expect(bottomReplyBtn).toBeDefined()
    fireEvent.click(bottomReplyBtn!)

    expect(
      screen.queryByText(/Відповідь на коментар Ментора від/),
    ).not.toBeInTheDocument()
  })
})
