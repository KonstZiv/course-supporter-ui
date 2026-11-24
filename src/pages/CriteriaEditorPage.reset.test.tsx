import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { CriteriaEditorPage } from './CriteriaEditorPage'
import { documentsApi } from '../api/documents'
import { criteriaApi } from '../api/criteria'
import { ApiError } from '../api/client'
import type {
  AuthoredDocumentResponse,
  CriteriaView,
  Criterion,
} from '../types/api'

vi.mock('../api/documents', () => ({
  documentsApi: {
    get: vi.fn(),
  },
}))

vi.mock('../api/criteria', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/criteria')>()
  return {
    ...actual,
    criteriaApi: {
      read: vi.fn(),
      replace: vi.fn(),
      reset: vi.fn(),
    },
  }
})

function makeDoc(overrides: Partial<AuthoredDocumentResponse> = {}): AuthoredDocumentResponse {
  return {
    id: 'doc-1',
    course_node_id: 'node-1',
    course_root_id: 'root-1',
    source_type: 'code',
    material_role: 'educational',
    task_type: 'task',
    order: 0,
    filename: 'task.py',
    title: 'Двійковий пошук',
    source_url: 's3://bucket/task.py',
    language: 'ukr',
    state: 'ready',
    processing_phase: 'ready',
    file_roles: null,
    job_id: null,
    error_message: null,
    error_category: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as AuthoredDocumentResponse
}

function makeCriterion(overrides: Partial<Criterion> = {}): Criterion {
  return {
    id: 'c1',
    text: 'Реалізувати двійковий пошук',
    evidence: 'Функція повертає індекс або -1',
    weight: 'should',
    check_method: 'model_verdict',
    soft_descent: false,
    concepts: [],
    mandatory_points: [],
    must_by_author: false,
    ...overrides,
  }
}

function makeAuthorView(overrides: Partial<CriteriaView> = {}): CriteriaView {
  return {
    status: 'ready',
    reason_code: null,
    message: null,
    waiting_submissions: 0,
    concepts: ['search'],
    contradictions: [],
    in_force: {
      layer: 'author',
      criteria: [
        makeCriterion({
          id: 'c1',
          weight: 'must',
          must_by_author: true,
          text: 'Авторський критерій',
        }),
      ],
    },
    model: [
      makeCriterion({
        id: 'c1',
        weight: 'must',
        must_by_author: false,
        text: 'Системний критерій',
      }),
    ],
    ...overrides,
  }
}

function makeModelView(overrides: Partial<CriteriaView> = {}): CriteriaView {
  return {
    status: 'ready',
    reason_code: null,
    message: null,
    waiting_submissions: 0,
    concepts: ['search'],
    contradictions: [],
    in_force: {
      layer: 'model',
      criteria: [
        makeCriterion({
          id: 'c1',
          weight: 'must',
          must_by_author: false,
          text: 'Системний критерій',
        }),
      ],
    },
    model: null,
    ...overrides,
  }
}

function renderPage(documentId = 'doc-1') {
  const router = createMemoryRouter(
    [
      {
        path: '/task/:documentId/criteria',
        element: <CriteriaEditorPage />,
      },
    ],
    {
      initialEntries: [`/task/${documentId}/criteria`],
    },
  )
  return render(<RouterProvider router={router} />)
}

describe('CriteriaEditorPage — A4 Скидання та блокування 429 (spec §3 К8, К9, К10, К11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(documentsApi.get).mockResolvedValue(makeDoc())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Кнопка «Повернути перелік системи» (наявність)', () => {
    it('є лише в шарі author і відсутня в шарі model', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeModelView())
      renderPage()

      expect(await screen.findByText('Перелік системи')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Повернути перелік системи' })).toBeNull()
    })

    it('відсутня в режимі правки', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Повернути перелік системи' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Правити перелік' }))
      expect(await screen.findByRole('button', { name: 'Зберегти перелік' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Повернути перелік системи' })).toBeNull()
    })
  })

  describe('Підтвердження й скасування (ConfirmDialog)', () => {
    it('відкриває ConfirmDialog при натисканні «Повернути перелік системи» і закриває на «Скасувати»', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Повернути перелік системи' }))

      const dialog = await screen.findByRole('dialog', { name: 'Повернути перелік системи?' })
      expect(dialog).toBeInTheDocument()
      expect(
        within(dialog).getByText(
          "Вашу правку буде скинуто: роботи перевірятимуться за переліком системи, і жоден критерій не буде обов'язковим для заліку.",
        ),
      ).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Повернути перелік системи?' })).toBeNull()
      })
      expect(criteriaApi.reset).not.toHaveBeenCalled()
    })
  })

  describe('Успіх DELETE /override', () => {
    it('успішне скидання переводить у К3 з відповіді сервера та показує смугу resetDone', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      const modelView = makeModelView({
        in_force: {
          layer: 'model',
          criteria: [
            makeCriterion({
              id: 'c1',
              weight: 'must',
              must_by_author: false,
              text: 'Відновлений системний критерій',
            }),
          ],
        },
      })
      vi.mocked(criteriaApi.reset).mockResolvedValue(modelView)

      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Повернути перелік системи' }))

      const dialog = await screen.findByRole('dialog', { name: 'Повернути перелік системи?' })
      const confirmBtn = within(dialog).getByRole('button', { name: 'Повернути' })
      expect(confirmBtn).toHaveClass('btn-danger')
      fireEvent.click(confirmBtn)

      expect(criteriaApi.reset).toHaveBeenCalledWith('doc-1')

      // Screen updates to K3 with server response and resetDone banner
      expect(await screen.findByText('Перелік системи')).toBeInTheDocument()
      expect(screen.getByText('Відновлений системний критерій')).toBeInTheDocument()
      expect(
        screen.getByText('Правку скинуто: роботи перевіряються за переліком системи.'),
      ).toBeInTheDocument()

      // Reset button disappears in model layer
      expect(screen.queryByRole('button', { name: 'Повернути перелік системи' })).toBeNull()
    })

    it('показує смугу savedWaiting при waiting_submissions > 0 після скидання', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      const modelViewWaiting = makeModelView({
        waiting_submissions: 3,
      })
      vi.mocked(criteriaApi.reset).mockResolvedValue(modelViewWaiting)

      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Повернути перелік системи' }))
      const dialog = await screen.findByRole('dialog', { name: 'Повернути перелік системи?' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Повернути' }))

      expect(
        await screen.findByText(
          'Збережено. Роботи, що чекали на перелік, передано на перевірку: 3 роботи.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('Правку скинуто: роботи перевіряються за переліком системи.')).toBeNull()
    })

    it('показує смугу savedWaiting при waiting_submissions > 0 після збереження (A3 update)', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      const savedWaitingView = makeAuthorView({
        waiting_submissions: 5,
      })
      vi.mocked(criteriaApi.replace).mockResolvedValue(savedWaitingView)

      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Правити перелік' }))

      const input = screen.getByDisplayValue('Авторський критерій')
      fireEvent.change(input, { target: { value: 'Оновлений текст автора' } })

      fireEvent.click(screen.getByRole('button', { name: 'Зберегти перелік' }))

      expect(
        await screen.findByText(
          'Збережено. Роботи, що чекали на перелік, передано на перевірку: 5 робіт.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('Перелік збережено: наступні роботи перевірятимуться за ним.')).toBeNull()
    })

    it('якщо після скидання status ≠ ready — показує К2', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      vi.mocked(criteriaApi.reset).mockResolvedValue({
        status: 'awaiting_first_submission',
        reason_code: null,
        message: null,
        waiting_submissions: 0,
        concepts: [],
        contradictions: [],
        in_force: null,
        model: null,
      })

      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Повернути перелік системи' }))
      const dialog = await screen.findByRole('dialog', { name: 'Повернути перелік системи?' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Повернути' }))

      expect(
        await screen.findByText(/Перелік критеріїв буде складено після першої подачі/),
      ).toBeInTheDocument()
      expect(screen.queryByText('Ваш перелік')).toBeNull()
    })
  })

  describe('Відмова DELETE /override', () => {
    it('відображає смугу помилки над переліком, вікно закрито, перелік залишається як був', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      vi.mocked(criteriaApi.reset).mockRejectedValue(
        new ApiError(500, 'Internal Server Error'),
      )

      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Повернути перелік системи' }))
      const dialog = await screen.findByRole('dialog', { name: 'Повернути перелік системи?' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Повернути' }))

      // Dialog closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Повернути перелік системи?' })).toBeNull()
      })

      // Error banner over the list
      expect(
        await screen.findByText(
          "Не вдалося повернути перелік системи. Перевірте з'єднання й спробуйте ще раз.",
        ),
      ).toBeInTheDocument()

      // List stays as it was
      expect(screen.getByText('Ваш перелік')).toBeInTheDocument()
      expect(screen.getByText('Авторський критерій')).toBeInTheDocument()
    })

    it('відмова мережі показує failed.reset', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      vi.mocked(criteriaApi.reset).mockRejectedValue(new TypeError('Failed to fetch'))

      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Повернути перелік системи' }))
      const dialog = await screen.findByRole('dialog', { name: 'Повернути перелік системи?' })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Повернути' }))

      expect(
        await screen.findByText(
          "Не вдалося повернути перелік системи. Перевірте з'єднання й спробуйте ще раз.",
        ),
      ).toBeInTheDocument()
      expect(screen.getByText('Авторський критерій')).toBeInTheDocument()
    })
  })

  describe('429 ліміт запитів (К10)', () => {
    it('429 на DELETE вимикає кнопку «Повернути перелік системи» на 60 секунд (fake timers)', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      vi.mocked(criteriaApi.reset).mockRejectedValue(
        new ApiError(429, 'Too Many Requests'),
      )

      renderPage()

      // Flush load()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(screen.getByText('Ваш перелік')).toBeInTheDocument()

      const resetBtn = screen.getByRole('button', { name: 'Повернути перелік системи' })
      fireEvent.click(resetBtn)

      const dialog = screen.getByRole('dialog', { name: 'Повернути перелік системи?' })
      const confirmBtn = within(dialog).getByRole('button', { name: 'Повернути' })
      fireEvent.click(confirmBtn)

      // Flush handleReset()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(
        screen.getByText(
          'Забагато запитів поспіль. Спробуйте за хвилину.',
        ),
      ).toBeInTheDocument()

      // Button is currently disabled
      expect(screen.getByRole('button', { name: 'Повернути перелік системи' })).toBeDisabled()

      // Advance 59 seconds -> still disabled
      await act(async () => {
        await vi.advanceTimersByTimeAsync(59000)
      })
      expect(screen.getByRole('button', { name: 'Повернути перелік системи' })).toBeDisabled()

      // Advance 1 more second (60s total) -> enabled again
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(screen.getByRole('button', { name: 'Повернути перелік системи' })).not.toBeDisabled()
    })

    it('429 на PUT вимикає кнопку «Зберегти перелік» на 60 секунд (fake timers)', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeAuthorView())
      vi.mocked(criteriaApi.replace).mockRejectedValue(
        new ApiError(429, 'Too Many Requests'),
      )

      renderPage()

      // Flush load()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(screen.getByText('Ваш перелік')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Правити перелік' }))

      const input = screen.getByDisplayValue('Авторський критерій')
      fireEvent.change(input, { target: { value: 'Новий текст' } })

      const saveBtn = screen.getByRole('button', { name: 'Зберегти перелік' })
      expect(saveBtn).not.toBeDisabled()

      fireEvent.click(saveBtn)

      // Flush save()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(
        screen.getByText(
          'Забагато запитів поспіль. Спробуйте за хвилину.',
        ),
      ).toBeInTheDocument()

      // Save button disabled
      expect(screen.getByRole('button', { name: 'Зберегти перелік' })).toBeDisabled()

      // Advance 59s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(59000)
      })
      expect(screen.getByRole('button', { name: 'Зберегти перелік' })).toBeDisabled()

      // Advance 1s -> 60s total
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })
      expect(screen.getByRole('button', { name: 'Зберегти перелік' })).not.toBeDisabled()
    })
  })
})
