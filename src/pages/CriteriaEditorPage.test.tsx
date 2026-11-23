import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CriteriaEditorPage } from './CriteriaEditorPage'
import { documentsApi } from '../api/documents'
import { criteriaApi } from '../api/criteria'
import { ApiError } from '../api/client'
import type {
  AuthoredDocumentResponse,
  CriteriaReasonCode,
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

function renderPage(documentId = 'doc-1') {
  return render(
    <MemoryRouter initialEntries={[`/task/${documentId}/criteria`]}>
      <Routes>
        <Route path="/task/:documentId/criteria" element={<CriteriaEditorPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CriteriaEditorPage (spec §3, A2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(documentsApi.get).mockResolvedValue(makeDoc())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('К1. Завантаження', () => {
    it('shows spinner, loading message and course link while loading', async () => {
      vi.mocked(criteriaApi.read).mockReturnValue(new Promise(() => {}))
      renderPage()

      expect(screen.getByText('Завантажую перелік критеріїв…')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'До курсу' })).toBeInTheDocument()
    })
  })

  describe('К2. Переліку немає (status ≠ ready)', () => {
    it('handles awaiting_first_submission without action buttons', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'awaiting_first_submission',
      })
      renderPage()

      expect(
        await screen.findByText(
          /Перелік критеріїв буде складено після першої подачі роботи/,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Оновити' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Правити перелік' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Повернути перелік системи' })).toBeNull()
    })

    it('handles composing with refresh button', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'composing',
      })
      renderPage()

      expect(
        await screen.findByText(/Перелік критеріїв складається зараз/),
      ).toBeInTheDocument()

      const refreshBtn = screen.getByRole('button', { name: 'Оновити' })
      expect(refreshBtn).toBeInTheDocument()

      fireEvent.click(refreshBtn)
      await waitFor(() => {
        expect(criteriaApi.read).toHaveBeenCalledTimes(2)
      })
    })

    it('polls reload every 15s while composing', async () => {
      vi.useFakeTimers()
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'composing',
      })
      renderPage()

      await vi.runOnlyPendingTimersAsync()
      expect(criteriaApi.read).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(15000)
      expect(criteriaApi.read).toHaveBeenCalledTimes(2)
    })

    it('handles not_composed with task_not_processed and back link', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'task_not_processed',
      })
      renderPage()

      expect(
        await screen.findByText(
          /Перелік критеріїв ще не складено: обробку тексту завдання не завершено/,
        ),
      ).toBeInTheDocument()
      const backLinks = screen.getAllByRole('link', { name: 'До курсу' })
      expect(backLinks.length).toBeGreaterThanOrEqual(1)
    })

    it('handles not_composed with models_unavailable', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'models_unavailable',
      })
      renderPage()

      expect(
        await screen.findByText(
          /сервіс, що його складає, був тимчасово недоступний/,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /Написати адміністраторові/ }),
      ).toBeInTheDocument()
    })

    it('handles not_composed with limit_reached', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'limit_reached',
      })
      renderPage()

      expect(
        await screen.findByText(
          /завдання завелике для обмежень, що зараз діють у системі/,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /Написати адміністраторові/ }),
      ).toBeInTheDocument()
    })

    it('handles not_composed with composition_error', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'composition_error',
      })
      renderPage()

      expect(
        await screen.findByText(
          /не вдалося скласти через внутрішню помилку системи/,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /Написати адміністраторові/ }),
      ).toBeInTheDocument()
    })

    it('handles not_composed with not_attempted', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'not_attempted',
      })
      renderPage()

      expect(
        await screen.findByText(
          /для поточної версії завдання ще не складався, а роботи студентів уже чекають/,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /Написати адміністраторові/ }),
      ).toBeInTheDocument()
    })

    it('handles unknown reason_code with status.unknown text', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'future_reason_code' as unknown as CriteriaReasonCode,
      })
      renderPage()

      expect(
        await screen.findByText(
          'Переліку критеріїв зараз немає. Оновіть сторінку; якщо стан не зміниться — зверніться до адміністратора системи.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: /Написати адміністраторові/ }),
      ).toBeInTheDocument()
    })

    it('shows waiting submissions count when > 0', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: 'models_unavailable',
        waiting_submissions: 3,
      })
      renderPage()

      expect(
        await screen.findByText('На перелік чекають роботи студентів: 3 роботи.'),
      ).toBeInTheDocument()
    })

    it('shows contradictions block in K2 if present', async () => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'awaiting_first_submission',
        contradictions: ['Завдання просить швидкість O(1), опис розділу вимагає пам’ять O(1)'],
      })
      renderPage()

      expect(
        await screen.findByText('Що система помітила в завданні'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Завдання просить швидкість O(1), опис розділу вимагає пам’ять O(1)'),
      ).toBeInTheDocument()
    })
  })

  describe('К3. Перелік системи без правки (in_force.layer = "model", author = null)', () => {
    it('displays layer badge, count, pass rule 80, modelMustsHint and criteria', async () => {
      const c1 = makeCriterion({ id: '1', weight: 'must' })
      const c2 = makeCriterion({ id: '2', weight: 'should', text: 'Оптимальний час роботи' })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        model: [c1, c2],
        author: null,
        in_force: {
          layer: 'model',
          criteria: [c1, c2],
        },
      })
      renderPage()

      expect(await screen.findByText('Перелік системи')).toBeInTheDocument()
      expect(screen.getByText('(2 критерії)')).toBeInTheDocument()

      // PassRule: score rule 80 and hint for model musts
      expect(
        screen.getByText(
          'Роботу зараховано, коли бал не менший за 80. Критеріїв, обов\'язкових для заліку, немає.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Вагу «обов'язковий» запропонувала система/),
      ).toBeInTheDocument()

      // Criteria cards
      expect(screen.getByText('Критерій 1')).toBeInTheDocument()
      expect(screen.getByText('Критерій 2')).toBeInTheDocument()

      // Neither showModel nor reset buttons exist
      expect(screen.queryByRole('button', { name: 'Показати перелік системи' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Повернути перелік системи' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Правити перелік' })).toBeNull()
    })
  })

  describe('К4. Ваш перелік (in_force.layer = "author")', () => {
    it('displays author layer, strict pass rule with threshold 70, and toggles model list comparison', async () => {
      const c1 = makeCriterion({ id: '1', weight: 'must', must_by_author: true })
      const modelC1 = makeCriterion({ id: 'm1', weight: 'must', text: 'Системний критерій' })

      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        model: [modelC1],
        author: [c1],
        in_force: {
          layer: 'author',
          criteria: [c1],
        },
      })
      renderPage()

      expect(await screen.findByText('Ваш перелік')).toBeInTheDocument()
      expect(screen.getByText('(1 критерій)')).toBeInTheDocument()

      // Strict pass rule
      expect(
        screen.getByText(
          'Роботу зараховано, коли виконано кожен критерій, обов\'язковий для заліку (1), і бал не менший за 70.',
        ),
      ).toBeInTheDocument()

      // Toggle model list
      const toggleBtn = screen.getByRole('button', { name: 'Показати перелік системи' })
      expect(toggleBtn).toBeInTheDocument()

      expect(screen.queryByText('Перелік системи — для порівняння; не діє, поки діє ваш')).toBeNull()

      fireEvent.click(toggleBtn)

      expect(
        screen.getByText('Перелік системи — для порівняння; не діє, поки діє ваш'),
      ).toBeInTheDocument()
      expect(screen.getByText('Системний критерій')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Сховати перелік системи' })).toBeInTheDocument()

      // Hide again
      fireEvent.click(screen.getByRole('button', { name: 'Сховати перелік системи' }))
      expect(screen.queryByText('Перелік системи — для порівняння; не діє, поки діє ваш')).toBeNull()
    })

    it('hides "Показати перелік системи" button when model list is null', async () => {
      const c1 = makeCriterion({ id: '1', weight: 'should' })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        model: null,
        author: [c1],
        in_force: {
          layer: 'author',
          criteria: [c1],
        },
      })
      renderPage()

      await screen.findByText('Ваш перелік')
      expect(screen.queryByRole('button', { name: 'Показати перелік системи' })).toBeNull()
    })
  })

  describe('К5. Позначки критерію у трьох випадках', () => {
    it('Case 1: model layer + must -> "Лише в балі" with scoreOnlyHint', async () => {
      const c = makeCriterion({ id: '1', weight: 'must' })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        model: [c],
        in_force: { layer: 'model', criteria: [c] },
      })
      renderPage()

      const badge = await screen.findByText('Лише в балі')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute(
        'title',
        'Цей критерій важить у балі, але сам залік не блокує.',
      )
    })

    it('Case 2: author layer + must + must_by_author: false -> "Лише в балі"', async () => {
      const c = makeCriterion({ id: '1', weight: 'must', must_by_author: false })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        author: [c],
        in_force: { layer: 'author', criteria: [c] },
      })
      renderPage()

      const badge = await screen.findByText('Лише в балі')
      expect(badge).toBeInTheDocument()
    })

    it('Case 3: author layer + must + must_by_author: true -> "Обов\'язковий для заліку" with mandatoryHint', async () => {
      const c = makeCriterion({ id: '1', weight: 'must', must_by_author: true })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        author: [c],
        in_force: { layer: 'author', criteria: [c] },
      })
      renderPage()

      const badge = await screen.findByText('Обов\'язковий для заліку')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute(
        'title',
        'Робота без цього критерію не буде зарахована, хоч би який був бал.',
      )
    })

    it('does not show pass mark for weight should or may', async () => {
      const c1 = makeCriterion({ id: '1', weight: 'should' })
      const c2 = makeCriterion({ id: '2', weight: 'may' })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        in_force: { layer: 'model', criteria: [c1, c2] },
      })
      renderPage()

      await screen.findByText('Критерій 1')
      expect(screen.queryByText('Лише в балі')).toBeNull()
      expect(screen.queryByText('Обов\'язковий для заліку')).toBeNull()
    })

    it('renders mandatory points, code_test soft descent note, and concepts', async () => {
      const c = makeCriterion({
        id: '1',
        weight: 'should',
        check_method: 'mandatory_points',
        mandatory_points: [
          { id: 'p1', text: 'Наявність функції solve()' },
          { id: 'p2', text: 'Обробка порожнього масиву' },
        ],
        concepts: ['Рекурсія', 'Складність'],
      })
      const c2 = makeCriterion({
        id: '2',
        weight: 'may',
        check_method: 'code_test',
        soft_descent: true,
        concepts: [],
      })
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        in_force: { layer: 'model', criteria: [c, c2] },
      })
      renderPage()

      expect(await screen.findByText('Наявність функції solve()')).toBeInTheDocument()
      expect(screen.getByText('Обробка порожнього масиву')).toBeInTheDocument()
      expect(screen.getByText('Рекурсія')).toBeInTheDocument()
      expect(screen.getByText('Складність')).toBeInTheDocument()

      expect(
        screen.getByText(
          'Запускати код система ще не вміє: поки цей критерій оцінює система за текстом і ознакою.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByText('Поняття не вибрано')).toBeInTheDocument()
    })
  })

  describe('К6. Суперечності', () => {
    it('displays contradictions block when contradictions are present', async () => {
      const c = makeCriterion()
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'ready',
        in_force: { layer: 'model', criteria: [c] },
        contradictions: [
          'Вимога мови Python 3.12 суперечить розділу про Python 3.10',
          'Формат виводу JSON суперечить рядковому формату',
        ],
      })
      renderPage()

      expect(await screen.findByText('Що система помітила в завданні')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Тут завдання суперечить опису розділу. Це бачите лише ви: ні в критерії, ні в бал воно не йде.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Вимога мови Python 3.12 суперечить розділу про Python 3.10'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Формат виводу JSON суперечить рядковому формату'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Щоб прибрати суперечність, поправте опис розділу/),
      ).toBeInTheDocument()
    })
  })

  describe('Відмови сервера та мережі (К10, К11, К12)', () => {
    it('handles 404 with refusal.notFound and course link', async () => {
      vi.mocked(criteriaApi.read).mockRejectedValue(
        new ApiError(404, 'Document not found'),
      )
      renderPage()

      expect(
        await screen.findByText('Завдання не знайдено: можливо, його видалено.'),
      ).toBeInTheDocument()
      const backLinks = screen.getAllByRole('link', { name: 'До курсу' })
      expect(backLinks.length).toBeGreaterThanOrEqual(1)
    })

    it('handles 422 NOT_A_TEXT_TASK for short task', async () => {
      vi.mocked(criteriaApi.read).mockRejectedValue(
        new ApiError(422, 'Unprocessable Entity', {
          detail: { code: 'NOT_A_TEXT_TASK', details: 'Not a text task' },
        }),
      )
      renderPage()

      expect(
        await screen.findByText(
          'У цього матеріалу немає переліку критеріїв: його мають лише короткі завдання, завдання й проєкти. Тест перевіряють позначки правильних відповідей у редакторі тесту.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Відкрити тест' })).toBeNull()
    })

    it('handles 422 NOT_A_TEXT_TASK for a test and provides open test link (К12)', async () => {
      vi.mocked(documentsApi.get).mockResolvedValue(
        makeDoc({ task_type: 'test', title: 'Підсумковий тест' }),
      )
      vi.mocked(criteriaApi.read).mockRejectedValue(
        new ApiError(422, 'Unprocessable Entity', {
          detail: { code: 'NOT_A_TEXT_TASK', details: 'Not a text task' },
        }),
      )
      renderPage()

      expect(
        await screen.findByText(
          'У цього матеріалу немає переліку критеріїв: його мають лише короткі завдання, завдання й проєкти. Тест перевіряють позначки правильних відповідей у редакторі тесту.',
        ),
      ).toBeInTheDocument()
      const openTestLink = screen.getByRole('link', { name: 'Відкрити тест' })
      expect(openTestLink).toBeInTheDocument()
      expect(openTestLink).toHaveAttribute('href', '/test/doc-1/edit')
    })

    it('handles 422 TASK_NOT_READY with refresh button', async () => {
      vi.mocked(criteriaApi.read).mockRejectedValue(
        new ApiError(422, 'Unprocessable Entity', {
          detail: { code: 'TASK_NOT_READY', details: 'Task not ready' },
        }),
      )
      renderPage()

      expect(
        await screen.findByText(
          'Завдання ще обробляється або його прибрано з курсу. Дочекайтеся кінця обробки й оновіть сторінку.',
        ),
      ).toBeInTheDocument()

      const refreshBtn = screen.getByRole('button', { name: 'Оновити' })
      expect(refreshBtn).toBeInTheDocument()

      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'awaiting_first_submission',
      })
      fireEvent.click(refreshBtn)

      expect(
        await screen.findByText(/Перелік критеріїв буде складено/),
      ).toBeInTheDocument()
    })

    it('handles network failure (TypeError / not ApiError) with retry button', async () => {
      vi.mocked(criteriaApi.read).mockRejectedValue(new TypeError('Failed to fetch'))
      renderPage()

      expect(
        await screen.findByText(
          'Не вдалося завантажити перелік критеріїв. Перевірте з\'єднання й оновіть сторінку.',
        ),
      ).toBeInTheDocument()

      const retryBtn = screen.getByRole('button', { name: 'Спробувати ще раз' })
      expect(retryBtn).toBeInTheDocument()

      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'awaiting_first_submission',
      })
      fireEvent.click(retryBtn)

      expect(
        await screen.findByText(/Перелік критеріїв буде складено/),
      ).toBeInTheDocument()
    })
  })
})
