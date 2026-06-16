import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { NodeSummaryEditView, NodeSummaryFinal } from '../../types/api'

// Minimal ApiError stand-in so ``err instanceof ApiError`` works against the
// same class the component imports (avoids the auth-store transitive import).
const { ApiError } = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public body?: unknown,
    ) {
      super(message)
    }
  }
  return { ApiError }
})
vi.mock('../../api/client', () => ({ ApiError }))

const { editViewMock, approveMock, acceptRawMock, patchMock, notYetMock } =
  vi.hoisted(() => ({
    editViewMock: vi.fn(),
    approveMock: vi.fn(),
    acceptRawMock: vi.fn(),
    patchMock: vi.fn(),
    notYetMock: vi.fn(),
  }))
vi.mock('../../api/node-summary', () => ({
  summaryApi: {
    editView: editViewMock,
    approve: approveMock,
    acceptRaw: acceptRawMock,
    patchFinal: patchMock,
  },
  notYetGeneratedDetail: notYetMock,
}))

import { SummaryModal } from './SummaryModal'

function makeFinal(overrides: Partial<NodeSummaryFinal> = {}): NodeSummaryFinal {
  return {
    id: 'final-1',
    course_node_id: 'node-1',
    title: 'Вступ до Python',
    description: 'Опис вузла',
    learning_objectives: ['Зрозуміти змінні'],
    knowledge: [{ name: 'Об’єкт', description: 'базова сутність' }],
    skills: [{ name: 'Присвоєння', description: 'зв’язати імʼя' }],
    success_criteria: [],
    assessment_approach: null,
    teaching_approach: null,
    key_activities: [],
    common_mistakes: [],
    main_concepts: ['variable', 'змінна'],
    secondary_concepts: [],
    enclosing_context: null,
    is_manual: false,
    manual_description: null,
    own_documents_count: 1,
    own_chars_count: 100,
    cumulative_documents_count: 1,
    cumulative_chars_count: 100,
    content_hash: 'h',
    approved_at: null,
    enclosing_context_updated_at: null,
    created_at: '2026-06-16T00:00:00Z',
    updated_at: '2026-06-16T00:00:00Z',
    ...overrides,
  }
}

function makeView(overrides: Partial<NodeSummaryEditView> = {}): NodeSummaryEditView {
  return {
    final: makeFinal(),
    raw_observations: ['Спостереження методиста A'],
    previous_snapshot: null,
    ...overrides,
  }
}

describe('SummaryModal — overview mode (Task 3.2.5b c3)', () => {
  beforeEach(() => {
    editViewMock.mockReset()
    approveMock.mockReset()
    acceptRawMock.mockReset()
    patchMock.mockReset()
    notYetMock.mockReset()
  })

  it('renders the read-only overview with verbatim concepts + observations', async () => {
    editViewMock.mockResolvedValue(makeView())
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)

    expect(await screen.findByText('Вступ до Python')).toBeInTheDocument()
    // Header identifies the node by its CourseNode title (not the Final's).
    expect(screen.getByText('Опис вузла — Тест-вузол')).toBeInTheDocument()
    // Concepts rendered verbatim — both forms of the bilingual key as stored.
    expect(screen.getByText('variable')).toBeInTheDocument()
    expect(screen.getByText('змінна')).toBeInTheDocument()
    expect(screen.getByText('Спостереження методиста A')).toBeInTheDocument()
  })

  it('approve takes the updated Final from the 200 response + flips state + onChanged', async () => {
    const onChanged = vi.fn()
    editViewMock.mockResolvedValue(makeView())
    approveMock.mockResolvedValue(makeFinal({ approved_at: '2026-06-16T01:00:00Z' }))
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={onChanged} />)

    await screen.findByText('Вступ до Python')
    expect(screen.getByText('Чернетка — не затверджено')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Затвердити'))

    await waitFor(() => expect(screen.getByText('Затверджено')).toBeInTheDocument())
    expect(approveMock).toHaveBeenCalledWith('node-1')
    expect(onChanged).toHaveBeenCalledOnce()
  })

  it('accept-raw calls the accept-raw endpoint', async () => {
    const onChanged = vi.fn()
    editViewMock.mockResolvedValue(makeView())
    acceptRawMock.mockResolvedValue(makeFinal({ approved_at: '2026-06-16T01:00:00Z' }))
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={onChanged} />)

    await screen.findByText('Вступ до Python')
    fireEvent.click(screen.getByText('Прийняти згенероване'))

    await waitFor(() => expect(acceptRawMock).toHaveBeenCalledWith('node-1'))
    expect(onChanged).toHaveBeenCalledOnce()
  })

  it('handles a not_yet_generated 404 gracefully via the extractor', async () => {
    editViewMock.mockRejectedValue(
      new ApiError(404, 'x', { detail: { reason: 'not_yet_generated' } }),
    )
    notYetMock.mockReturnValue({ reason: 'not_yet_generated' })
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)

    expect(
      await screen.findByText('Опис ще не згенеровано для цього вузла.'),
    ).toBeInTheDocument()
  })

  it('handles a generic 404 (node gone) gracefully', async () => {
    editViewMock.mockRejectedValue(
      new ApiError(404, 'x', { detail: 'Node not found' }),
    )
    notYetMock.mockReturnValue(null)
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)

    expect(
      await screen.findByText('Опис недоступний — вузол не знайдено.'),
    ).toBeInTheDocument()
  })

  it('enters edit mode with the title prefilled as a value', async () => {
    editViewMock.mockResolvedValue(makeView())
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)
    fireEvent.click(await screen.findByText('Редагувати'))
    // value-prefill (Ratified #4), not placeholder.
    expect(screen.getByDisplayValue('Вступ до Python')).toBeInTheDocument()
  })

  it('disables Save until something changes', async () => {
    editViewMock.mockResolvedValue(makeView())
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)
    fireEvent.click(await screen.findByText('Редагувати'))
    expect(screen.getByText('Зберегти').closest('button')).toBeDisabled()
  })

  it('Save sends a PATCH with ONLY the changed key (Ratified #5)', async () => {
    const onChanged = vi.fn()
    editViewMock.mockResolvedValue(makeView())
    patchMock.mockResolvedValue(makeFinal({ title: 'Оновлений заголовок' }))
    render(
      <SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={onChanged} />,
    )
    fireEvent.click(await screen.findByText('Редагувати'))

    fireEvent.change(screen.getByDisplayValue('Вступ до Python'), {
      target: { value: 'Оновлений заголовок' },
    })
    fireEvent.click(screen.getByText('Зберегти'))

    await waitFor(() =>
      expect(patchMock).toHaveBeenCalledWith('node-1', {
        title: 'Оновлений заголовок',
      }),
    )
    // Back to overview with the updated Final; tree refreshed.
    expect(onChanged).toHaveBeenCalledOnce()
    expect(await screen.findByText('Оновлений заголовок')).toBeInTheDocument()
  })

  it('hides the diff toggle when there is no previous snapshot', async () => {
    editViewMock.mockResolvedValue(makeView()) // previous_snapshot: null
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)
    await screen.findByText('Вступ до Python')
    expect(
      screen.queryByText('Порівняти з попередньою версією'),
    ).not.toBeInTheDocument()
  })

  it('highlights only the changed field on diff (field-level)', async () => {
    const snapshot = {
      ...makeFinal(),
      title: 'Старий заголовок',
    } as unknown as Record<string, unknown>
    editViewMock.mockResolvedValue(makeView({ previous_snapshot: snapshot }))
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)

    fireEvent.click(await screen.findByText('Порівняти з попередньою версією'))
    // Only the title differs → exactly one "змінено" marker.
    expect(screen.getAllByText('змінено')).toHaveLength(1)

    fireEvent.click(screen.getByText('Сховати порівняння'))
    expect(screen.queryByText('змінено')).not.toBeInTheDocument()
  })

  it('treats a key missing from an older snapshot as changed', async () => {
    const final = makeFinal({ enclosing_context: 'присутнє зараз' })
    const snapshot = { ...final } as Record<string, unknown>
    delete snapshot.enclosing_context // older Final schema lacked the field
    editViewMock.mockResolvedValue(
      makeView({ final, previous_snapshot: snapshot }),
    )
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)

    fireEvent.click(await screen.findByText('Порівняти з попередньою версією'))
    expect(screen.getAllByText('змінено')).toHaveLength(1)
  })

  it('shows a human PATCH 422 message, not silence', async () => {
    editViewMock.mockResolvedValue(makeView())
    patchMock.mockRejectedValue(
      new ApiError(422, 'x', {
        detail: 'No editable fields supplied in PATCH body.',
      }),
    )
    render(<SummaryModal nodeId="node-1" nodeTitle="Тест-вузол" onClose={vi.fn()} onChanged={vi.fn()} />)
    fireEvent.click(await screen.findByText('Редагувати'))
    fireEvent.change(screen.getByDisplayValue('Вступ до Python'), {
      target: { value: 'Змінено' },
    })
    fireEvent.click(screen.getByText('Зберегти'))

    expect(
      await screen.findByText('No editable fields supplied in PATCH body.'),
    ).toBeInTheDocument()
  })
})
