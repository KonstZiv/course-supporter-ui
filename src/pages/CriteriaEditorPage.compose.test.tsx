import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CriteriaEditorPage } from './CriteriaEditorPage'
import { documentsApi } from '../api/documents'
import { criteriaApi } from '../api/criteria'
import { ApiError } from '../api/client'
import ukPanel from '../i18n/catalogs/uk/panel.json'
import enPanel from '../i18n/catalogs/en/panel.json'
import type {
  AuthoredDocumentResponse,
  CriteriaReasonCode,
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
      compose: vi.fn(),
      replace: vi.fn(),
      reset: vi.fn(),
    },
  }
})

function makeDoc(
  overrides: Partial<AuthoredDocumentResponse> = {},
): AuthoredDocumentResponse {
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
    concepts: ['Масиви'],
    mandatory_points: [],
    must_by_author: null,
    ...overrides,
  }
}

function makeReadyView(criteriaList: Criterion[] = [makeCriterion()]): CriteriaView {
  return {
    status: 'ready',
    reason_code: null,
    message: null,
    waiting_submissions: 0,
    model: criteriaList,
    author: null,
    in_force: {
      layer: 'model',
      criteria: criteriaList,
    },
    contradictions: [],
    concepts: ['Масиви'],
  }
}

function renderPage(documentId = 'doc-1') {
  return render(
    <MemoryRouter initialEntries={[`/task/${documentId}/criteria`]}>
      <Routes>
        <Route path="/task/:documentId/criteria" element={<CriteriaEditorPage />} />
        <Route path="/billing" element={<div>Billing Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CriteriaEditorPage — Г-48 Скласти перелік зараз', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(documentsApi.get).mockResolvedValue(makeDoc())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('awaiting_first_submission → кнопка є; «Скасувати» у вікні — запиту немає', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue({
      status: 'awaiting_first_submission',
    })
    renderPage()

    const composeBtn = await screen.findByRole('button', {
      name: 'Скласти перелік зараз',
    })
    fireEvent.click(composeBtn)

    const dialog = await screen.findByRole('dialog', {
      name: 'Скласти перелік зараз?',
    })
    expect(
      within(dialog).getByText(
        'Складання переліку оплачується юнітами з вашого пакета — так само, як коли перелік складає перша подача студента. Це триває кілька хвилин.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Скласти перелік зараз?' }),
      ).toBeNull()
    })
    expect(criteriaApi.compose).not.toHaveBeenCalled()
  })

  it('«Скласти» → POST, кнопки недоступні поки триває, 202 → composing і опитування GET кожні 10 с, коли ready → перелік і опитування зупинилось', async () => {
    vi.useFakeTimers()
    vi.mocked(criteriaApi.read).mockResolvedValue({
      status: 'awaiting_first_submission',
    })

    let resolveCompose!: (value: CriteriaView) => void
    vi.mocked(criteriaApi.compose).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCompose = resolve
        }),
    )

    renderPage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(criteriaApi.read).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Скласти перелік зараз' }))
    const dialog = screen.getByRole('dialog', { name: 'Скласти перелік зараз?' })
    const confirmBtn = within(dialog).getByRole('button', { name: 'Скласти' })

    fireEvent.click(confirmBtn)
    expect(criteriaApi.compose).toHaveBeenCalledWith('doc-1')
    expect(confirmBtn).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Скласти перелік зараз' }),
    ).toBeDisabled()

    await act(async () => {
      resolveCompose({ status: 'composing' })
      await Promise.resolve()
    })

    expect(
      screen.getByText(/Перелік критеріїв складається зараз/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Скласти перелік зараз' }),
    ).toBeNull()

    // Polling every 10s while composing
    vi.mocked(criteriaApi.read).mockResolvedValueOnce({ status: 'composing' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(criteriaApi.read).toHaveBeenCalledTimes(2)

    // Next poll returns ready list
    vi.mocked(criteriaApi.read).mockResolvedValueOnce(
      makeReadyView([makeCriterion({ id: 'c1', text: 'Перевірений критерій' })]),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(criteriaApi.read).toHaveBeenCalledTimes(3)
    expect(screen.getByText('Перевірений критерій')).toBeInTheDocument()

    // Polling stops once status is ready
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20000)
    })
    expect(criteriaApi.read).toHaveBeenCalledTimes(3)
  })

  it('зупиняє опитування GET, коли сторінку закрито у стані composing', async () => {
    vi.useFakeTimers()
    vi.mocked(criteriaApi.read).mockResolvedValue({ status: 'composing' })

    const view = renderPage()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(criteriaApi.read).toHaveBeenCalledTimes(1)

    view.unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(criteriaApi.read).toHaveBeenCalledTimes(1)
  })

  it('200 на POST → перелік одразу на екрані', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue({
      status: 'awaiting_first_submission',
    })
    vi.mocked(criteriaApi.compose).mockResolvedValue(
      makeReadyView([makeCriterion({ id: 'c1', text: 'Готовий перелік' })]),
    )
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Скласти перелік зараз' }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Скласти перелік зараз?',
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скласти' }))

    expect(await screen.findByText('Готовий перелік')).toBeInTheDocument()
    expect(criteriaApi.read).toHaveBeenCalledTimes(1)
  })

  it('стан composing → кнопки «Скласти перелік зараз» немає', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue({ status: 'composing' })
    renderPage()

    expect(
      await screen.findByText(/Перелік критеріїв складається зараз/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Скласти перелік зараз' }),
    ).toBeNull()
  })

  it('відмова коштів (402 insufficient_units) → новий текст Т2, «Купити юніти» на /billing і кнопка поруч', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue({
      status: 'awaiting_first_submission',
    })
    vi.mocked(criteriaApi.compose).mockRejectedValue(
      new ApiError(402, 'API error 402', {
        detail: {
          code: 'insufficient_units',
          details: { price_units: 30, available_units: 10, missing_units: 20 },
        },
      }),
    )
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Скласти перелік зараз' }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Скласти перелік зараз?',
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скласти' }))

    expect(
      await screen.findByText(
        'Перелік не складено: на це не вистачило юнітів у вашому пакеті. Купіть юніти й натисніть «Скласти перелік зараз» ще раз.',
      ),
    ).toBeInTheDocument()
    const buyLink = screen.getByRole('link', { name: 'Купити юніти' })
    expect(buyLink).toHaveAttribute('href', '/billing')
    expect(
      screen.getByRole('button', { name: 'Скласти перелік зараз' }),
    ).toBeInTheDocument()
  })

  it.each<CriteriaReasonCode>(['models_unavailable', 'not_attempted'])(
    'not_composed з причиною %s → кнопка «Скласти перелік зараз» є',
    async (reasonCode) => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: reasonCode,
      })
      renderPage()

      expect(
        await screen.findByRole('button', { name: 'Скласти перелік зараз' }),
      ).toBeInTheDocument()
    },
  )

  it.each<CriteriaReasonCode>([
    'task_not_processed',
    'limit_reached',
    'composition_error',
  ])(
    'not_composed з причиною %s → кнопки «Скласти перелік зараз» немає',
    async (reasonCode) => {
      vi.mocked(criteriaApi.read).mockResolvedValue({
        status: 'not_composed',
        reason_code: reasonCode,
      })
      renderPage()

      await screen.findByText(/Перелік критеріїв/)
      expect(
        screen.queryByRole('button', { name: 'Скласти перелік зараз' }),
      ).toBeNull()
    },
  )

  it('409 GENERATION_IN_PROGRESS → показує наявну загальну відмову маршруту', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue({
      status: 'awaiting_first_submission',
    })
    vi.mocked(criteriaApi.compose).mockRejectedValue(
      new ApiError(409, 'API error 409', {
        detail: {
          code: 'GENERATION_IN_PROGRESS',
          details:
            'Завдання ще обробляється — спробуйте скласти перелік, коли обробку буде завершено',
        },
      }),
    )
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Скласти перелік зараз' }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Скласти перелік зараз?',
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скласти' }))

    expect(
      await screen.findByText(
        'Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, напишіть нам.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Скласти перелік зараз' }),
    ).toBeInTheDocument()
  })

  it('422 TASK_NOT_READY → показує відмову taskNotReady і кнопку «Оновити»', async () => {
    vi.mocked(criteriaApi.read).mockResolvedValue({
      status: 'awaiting_first_submission',
    })
    vi.mocked(criteriaApi.compose).mockRejectedValue(
      new ApiError(422, 'API error 422', {
        detail: {
          code: 'TASK_NOT_READY',
          details: 'the task has no ready summary yet',
        },
      }),
    )
    renderPage()

    fireEvent.click(
      await screen.findByRole('button', { name: 'Скласти перелік зараз' }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Скласти перелік зараз?',
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скласти' }))

    expect(
      await screen.findByText(
        'Завдання ще обробляється або його прибрано з курсу. Дочекайтеся кінця обробки й оновіть сторінку.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Оновити' })).toBeInTheDocument()
  })

  it('має дослівні тексти Т2 та оновлений awaitingFirstSubmission обома мовами (uk/en)', () => {
    expect(ukPanel['panel.criteria.status.awaitingFirstSubmission']).toBe(
      'Перелік критеріїв ще не складено. Його складе перша подача роботи студента — або складіть його зараз, щоб переглянути й поправити до того, як студенти почнуть здавати роботи.',
    )
    expect(enPanel['panel.criteria.status.awaitingFirstSubmission']).toBe(
      'The list of criteria has not been composed yet. The first work a student submits will compose it — or compose it now, to review and edit it before students start submitting work.',
    )
    expect(ukPanel['panel.criteria.compose.button']).toBe('Скласти перелік зараз')
    expect(enPanel['panel.criteria.compose.button']).toBe('Compose the list now')
    expect(ukPanel['panel.criteria.compose.title']).toBe('Скласти перелік зараз?')
    expect(enPanel['panel.criteria.compose.title']).toBe('Compose the list now?')
    expect(ukPanel['panel.criteria.compose.text']).toBe(
      'Складання переліку оплачується юнітами з вашого пакета — так само, як коли перелік складає перша подача студента. Це триває кілька хвилин.',
    )
    expect(enPanel['panel.criteria.compose.text']).toBe(
      "Composing the list is paid for with units from your package — just as when a student's first submission composes it. It takes a few minutes.",
    )
    expect(ukPanel['panel.criteria.compose.confirm']).toBe('Скласти')
    expect(enPanel['panel.criteria.compose.confirm']).toBe('Compose')
    expect(ukPanel['panel.criteria.compose.insufficientUnits']).toBe(
      'Перелік не складено: на це не вистачило юнітів у вашому пакеті. Купіть юніти й натисніть «Скласти перелік зараз» ще раз.',
    )
    expect(enPanel['panel.criteria.compose.insufficientUnits']).toBe(
      'The list was not composed: there were not enough units in your package. Buy units and press "Compose the list now" again.',
    )
  })
})
