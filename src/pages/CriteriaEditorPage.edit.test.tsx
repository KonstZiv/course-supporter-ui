import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
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
    evidence: 'Функція повертає індекс знайденого елемента',
    weight: 'must',
    check_method: 'model_verdict',
    soft_descent: false,
    concepts: ['Масиви', 'Алгоритми пошуку'],
    mandatory_points: [],
    must_by_author: null,
    ...overrides,
  }
}

function makeReadyView(criteriaList: Criterion[] = [makeCriterion()]): CriteriaView {
  return {
    status: 'ready',
    concepts: ['Масиви', 'Алгоритми пошуку', 'Рекурсія'],
    in_force: {
      layer: 'model',
      criteria: criteriaList,
    },
    model: criteriaList,
    author: null,
  }
}

function renderPage(documentId = 'doc-1') {
  const router = createMemoryRouter(
    [
      {
        path: '/task/:documentId/criteria',
        element: <CriteriaEditorPage />,
      },
      {
        path: '/course/:courseId',
        element: <div>Course Page</div>,
      },
    ],
    {
      initialEntries: [`/task/${documentId}/criteria`],
    },
  )
  return render(<RouterProvider router={router} />)
}

describe('CriteriaEditorPage — A3 Правка й збереження (spec §3 К7, К8, К10, К11)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(documentsApi.get).mockResolvedValue(makeDoc())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens edit mode when clicking "Правити перелік"', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
    renderPage()

    const editBtn = await screen.findByRole('button', { name: 'Правити перелік' })
    fireEvent.click(editBtn)

    expect(screen.getByRole('button', { name: 'Зберегти перелік' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Скасувати' })).toBeInTheDocument()
    expect(screen.getByText('Немає змін')).toBeInTheDocument()
  })

  describe('Перемикач "Обов\'язковий для заліку" (MandatorySwitch) та вага', () => {
    it('is visible only when weight is "must", and hidden for "should" or "may"', async () => {
      const c1 = makeCriterion({ weight: 'must' })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([c1]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      // Visible for must
      expect(screen.getByRole('switch', { name: "Зробити обов'язковим для заліку" })).toBeInTheDocument()

      // Switch weight to "бажаний — 2"
      fireEvent.click(screen.getByRole('radio', { name: 'бажаний — 2' }))

      // Hidden for should
      expect(screen.queryByRole('switch', { name: "Зробити обов'язковим для заліку" })).toBeNull()

      // Switch weight to "додатковий — 1"
      fireEvent.click(screen.getByRole('radio', { name: 'додатковий — 1' }))
      expect(screen.queryByRole('switch', { name: "Зробити обов'язковим для заліку" })).toBeNull()
    })

    it('lowering weight clears the mandatory mark', async () => {
      const c1 = makeCriterion({ weight: 'must', must_by_author: true })
      const view: CriteriaView = {
        ...makeReadyView([c1]),
        in_force: { layer: 'author', criteria: [c1] },
      }
      vi.mocked(criteriaApi.read).mockResolvedValue(view)
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      const sw = screen.getByRole('switch', { name: "Зробити обов'язковим для заліку" })
      expect(sw).toHaveAttribute('aria-checked', 'true')

      // Lower weight to "бажаний — 2"
      fireEvent.click(screen.getByRole('radio', { name: 'бажаний — 2' }))

      // Raise weight back to "обов'язковий — 3" -> switch should be off (cleared)
      fireEvent.click(screen.getByRole('radio', { name: "обов'язковий — 3" }))
      const sw2 = screen.getByRole('switch', { name: "Зробити обов'язковим для заліку" })
      expect(sw2).toHaveAttribute('aria-checked', 'false')
    })

    it('П1: new criterion and criterion raised to must have switch off by default', async () => {
      const c1 = makeCriterion({ weight: 'should' })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([c1]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      // 1. Existing criterion raised to must
      fireEvent.click(screen.getByRole('radio', { name: "обов'язковий — 3" }))
      const sw1 = screen.getByRole('switch', { name: "Зробити обов'язковим для заліку" })
      expect(sw1).toHaveAttribute('aria-checked', 'false')

      // 2. Add new criterion
      fireEvent.click(screen.getByRole('button', { name: 'Додати критерій' }))
      const switches = screen.getAllByRole('radio', { name: "обов'язковий — 3" })
      // Click must on the newly added second card
      fireEvent.click(switches[1]!)
      const sw2 = screen.getAllByRole('switch', { name: "Зробити обов'язковим для заліку" })[1]!
      expect(sw2).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('Спосіб перевірки code_test', () => {
    it('is only available when task_type is project', async () => {
      // 1. Task type = task -> code_test option not present
      vi.mocked(documentsApi.get).mockResolvedValue(makeDoc({ task_type: 'task' }))
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
      const { unmount } = renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))
      expect(screen.queryByText(/Запуск коду \(лише проєкт\)/)).toBeNull()

      unmount()

      // 2. Task type = project -> code_test option is present
      vi.mocked(documentsApi.get).mockResolvedValue(makeDoc({ task_type: 'project' }))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))
      expect(screen.getByText(/Запуск коду \(лише проєкт\)/)).toBeInTheDocument()
    })
  })

  describe('Обов\'язкові пункти (mandatory_points)', () => {
    it('appear when check_method changed to mandatory_points and disappear when switched away', async () => {
      const c1 = makeCriterion({ check_method: 'model_verdict', mandatory_points: [] })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([c1]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      const methodSelect = screen.getByRole('combobox')
      // Switch to mandatory_points
      fireEvent.change(methodSelect, { target: { value: 'mandatory_points' } })

      // Auto-added 1 empty point
      expect(screen.getByPlaceholderText('Що має бути в роботі')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Додати пункт' })).toBeInTheDocument()

      // Switch back to model_verdict (point is empty, so no confirm dialog)
      fireEvent.change(methodSelect, { target: { value: 'model_verdict' } })
      expect(screen.queryByPlaceholderText('Що має бути в роботі')).toBeNull()
    })

    it('prompts confirm dialog when switching away from mandatory_points with non-empty points', async () => {
      const c1 = makeCriterion({
        check_method: 'mandatory_points',
        mandatory_points: [{ id: 'pt1', text: 'Пункт 1' }],
      })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([c1]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      const methodSelect = screen.getByRole('combobox')
      // Try switching to model_verdict
      fireEvent.change(methodSelect, { target: { value: 'model_verdict' } })

      // Confirm dialog appears
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText("Прибрати обов'язкові пункти?")).toBeInTheDocument()
      expect(
        within(dialog).getByText('Інший спосіб перевірки не має пунктів: їх буде прибрано з цього критерію.'),
      ).toBeInTheDocument()

      // Cancel keeps points
      fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
      expect(screen.getByDisplayValue('Пункт 1')).toBeInTheDocument()

      // Try switching again and confirm
      fireEvent.change(methodSelect, { target: { value: 'model_verdict' } })
      const dialog2 = screen.getByRole('dialog')
      fireEvent.click(within(dialog2).getByRole('button', { name: "Прибрати обов'язкові пункти" }))

      expect(screen.queryByDisplayValue('Пункт 1')).toBeNull()
      expect(screen.queryByPlaceholderText('Що має бути в роботі')).toBeNull()
    })
  })

  describe('Межі (Limits)', () => {
    it('disables remove button when only 1 criterion remains', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([makeCriterion()]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      const removeBtn = screen.getByRole('button', { name: 'Прибрати критерій c1' })
      expect(removeBtn).toBeDisabled()
      expect(removeBtn).toHaveAttribute(
        'title',
        'У переліку має бути хоча б один критерій. Щоб повернутися до переліку системи, скористайтеся «Повернути перелік системи».',
      )
    })

    it('enforces character limits on text and evidence', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([makeCriterion()]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      const textInput = screen.getByDisplayValue('Реалізувати двійковий пошук')
      fireEvent.change(textInput, { target: { value: ' ' } })
      expect(screen.getByText('Впишіть, що перевірити.')).toBeInTheDocument()

      fireEvent.change(textInput, { target: { value: 'a'.repeat(601) } })
      expect(screen.getByText('Задовго: до 600 знаків.')).toBeInTheDocument()

      const saveBtn = screen.getByRole('button', { name: 'Зберегти перелік' })
      expect(saveBtn).toBeDisabled()
      expect(saveBtn).toHaveAttribute('title', 'Щоб зберегти перелік, виправте позначені місця.')
    })
  })

  describe('Збереження та тіло PUT (spec 3.К8, 5.A3)', () => {
    it('sends PUT with explicit must_by_author, without soft_descent, and new items without id', async () => {
      const c1 = makeCriterion({
        id: 'c1',
        weight: 'must',
        soft_descent: false,
        must_by_author: false,
      })
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView([c1]))
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      // Toggle switch to true on first criterion
      const sw = screen.getByRole('switch', { name: "Зробити обов'язковим для заліку" })
      fireEvent.click(sw)

      // Add a new criterion
      fireEvent.click(screen.getByRole('button', { name: 'Додати критерій' }))
      const textareas = screen.getAllByRole('textbox')
      // Fill text and evidence of the newly added criterion
      fireEvent.change(textareas[2]!, { target: { value: 'Новий критерій перевірки' } })
      fireEvent.change(textareas[3]!, { target: { value: 'Новий результат виконання' } })

      const savedResponse: CriteriaView = {
        status: 'ready',
        in_force: {
          layer: 'author',
          criteria: [
            {
              ...c1,
              must_by_author: true,
            },
            {
              id: 'c2_new',
              text: 'Новий критерій перевірки',
              evidence: 'Новий результат виконання',
              weight: 'should',
              check_method: 'model_verdict',
              soft_descent: false,
              concepts: [],
              mandatory_points: [],
              must_by_author: null,
            },
          ],
        },
        model: [c1],
        author: [],
      }

      vi.mocked(criteriaApi.replace).mockResolvedValue(savedResponse)

      const saveBtn = screen.getByRole('button', { name: 'Зберегти перелік' })
      expect(saveBtn).not.toBeDisabled()
      fireEvent.click(saveBtn)

      await waitFor(() => {
        expect(criteriaApi.replace).toHaveBeenCalledWith('doc-1', {
          criteria: [
            {
              id: 'c1',
              text: 'Реалізувати двійковий пошук',
              evidence: 'Функція повертає індекс знайденого елемента',
              weight: 'must',
              check_method: 'model_verdict',
              concepts: ['Масиви', 'Алгоритми пошуку'],
              mandatory_points: [],
              must_by_author: true,
            },
            {
              text: 'Новий критерій перевірки',
              evidence: 'Новий результат виконання',
              weight: 'should',
              check_method: 'model_verdict',
              concepts: [],
              mandatory_points: [],
            },
          ],
        })
      })

      // Form closes and displays K4 from response
      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      expect(screen.getByText('Перелік збережено: наступні роботи перевірятимуться за ним.')).toBeInTheDocument()
    })
  })

  describe('Відмови сервера К10 для PUT', () => {
    it('handles 422 UNKNOWN_CRITERION_ID: shows banner, refresh button, keeps form open', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))
      const textInput = screen.getByDisplayValue('Реалізувати двійковий пошук')
      fireEvent.change(textInput, { target: { value: 'Змінений текст' } })

      vi.mocked(criteriaApi.replace).mockRejectedValue(
        new ApiError(422, 'Unprocessable Entity', {
          detail: { code: 'UNKNOWN_CRITERION_ID', details: 'Criterion changed' },
        }),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Зберегти перелік' }))

      expect(
        await screen.findByText(
          'Перелік не збережено: поки ви правили, він змінився — наприклад, в іншій вкладці. Ваші зміни лишаються на екрані; оновіть перелік і внесіть їх ще раз.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Оновити перелік' })).toBeInTheDocument()
      // Form remains open with edits
      expect(screen.getByDisplayValue('Змінений текст')).toBeInTheDocument()
    })

    it('handles 422 CHECK_METHOD_NOT_ADMITTED with field highlight', async () => {
      vi.mocked(documentsApi.get).mockResolvedValue(makeDoc({ task_type: 'project' }))
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'code_test' } })

      vi.mocked(criteriaApi.replace).mockRejectedValue(
        new ApiError(422, 'Unprocessable Entity', {
          detail: { code: 'CHECK_METHOD_NOT_ADMITTED', details: 'Not allowed' },
        }),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Зберегти перелік' }))

      expect(
        await screen.findByText(
          'Перевірка запуском коду можлива лише в проєкті. Виберіть інший спосіб перевірки в позначених критеріях.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('handles 422 array: highlights invalid field', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))
      const textInput = screen.getByDisplayValue('Реалізувати двійковий пошук')
      fireEvent.change(textInput, { target: { value: 'Змінений текст' } })

      vi.mocked(criteriaApi.replace).mockRejectedValue(
        new ApiError(422, 'Unprocessable Entity', {
          detail: [
            {
              loc: ['body', 'criteria', 0, 'text'],
              msg: 'Field error',
              type: 'value_error',
            },
          ],
        }),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Зберегти перелік' }))

      expect(
        await screen.findByText('Перелік не збережено: виправте позначене червоним нижче.'),
      ).toBeInTheDocument()
      expect(screen.getByDisplayValue('Змінений текст')).toHaveAttribute('aria-invalid', 'true')
    })

    it('handles network failure with failed.save banner and keeps changes', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))
      const textInput = screen.getByDisplayValue('Реалізувати двійковий пошук')
      fireEvent.change(textInput, { target: { value: 'Змінений текст' } })

      vi.mocked(criteriaApi.replace).mockRejectedValue(new TypeError('Network Error'))

      fireEvent.click(screen.getByRole('button', { name: 'Зберегти перелік' }))

      expect(
        await screen.findByText(
          'Не вдалося зберегти перелік. Перевірте з\'єднання й спробуйте ще раз — ваші зміни лишаються на екрані.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByDisplayValue('Змінений текст')).toBeInTheDocument()
    })
  })

  describe('Захист виходу з незбереженим (useLeaveGuard)', () => {
    it('asks confirmation on cancel when form is dirty', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue(makeReadyView())
      renderPage()

      fireEvent.click(await screen.findByRole('button', { name: 'Правити перелік' }))

      // When clean, cancel closes immediately
      fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
      expect(screen.queryByText('Піти без збереження?')).toBeNull()

      // Re-enter edit mode and make dirty
      fireEvent.click(screen.getByRole('button', { name: 'Правити перелік' }))
      const textInput = screen.getByDisplayValue('Реалізувати двійковий пошук')
      fireEvent.change(textInput, { target: { value: 'Новий текст' } })

      // Cancel now prompts
      fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
      expect(screen.getByText('Піти без збереження?')).toBeInTheDocument()
      expect(
        screen.getByText('Зміни в переліку не збережено — їх буде втрачено.'),
      ).toBeInTheDocument()

      // Click "Лишитися" -> stays in edit mode
      fireEvent.click(screen.getByRole('button', { name: 'Лишитися' }))
      expect(screen.getByDisplayValue('Новий текст')).toBeInTheDocument()

      // Click "Скасувати" then "Піти без збереження" -> leaves
      fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
      fireEvent.click(screen.getByRole('button', { name: 'Піти без збереження' }))
      expect(screen.queryByDisplayValue('Новий текст')).toBeNull()
    })
  })
})
