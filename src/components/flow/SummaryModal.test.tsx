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

const { editViewMock, approveMock, acceptRawMock, notYetMock } = vi.hoisted(
  () => ({
    editViewMock: vi.fn(),
    approveMock: vi.fn(),
    acceptRawMock: vi.fn(),
    notYetMock: vi.fn(),
  }),
)
vi.mock('../../api/node-summary', () => ({
  summaryApi: {
    editView: editViewMock,
    approve: approveMock,
    acceptRaw: acceptRawMock,
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
    notYetMock.mockReset()
  })

  it('renders the read-only overview with verbatim concepts + observations', async () => {
    editViewMock.mockResolvedValue(makeView())
    render(<SummaryModal nodeId="node-1" onClose={vi.fn()} onChanged={vi.fn()} />)

    expect(await screen.findByText('Вступ до Python')).toBeInTheDocument()
    // Concepts rendered verbatim — both forms of the bilingual key as stored.
    expect(screen.getByText('variable')).toBeInTheDocument()
    expect(screen.getByText('змінна')).toBeInTheDocument()
    expect(screen.getByText('Спостереження методиста A')).toBeInTheDocument()
  })

  it('approve takes the updated Final from the 200 response + flips state + onChanged', async () => {
    const onChanged = vi.fn()
    editViewMock.mockResolvedValue(makeView())
    approveMock.mockResolvedValue(makeFinal({ approved_at: '2026-06-16T01:00:00Z' }))
    render(<SummaryModal nodeId="node-1" onClose={vi.fn()} onChanged={onChanged} />)

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
    render(<SummaryModal nodeId="node-1" onClose={vi.fn()} onChanged={onChanged} />)

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
    render(<SummaryModal nodeId="node-1" onClose={vi.fn()} onChanged={vi.fn()} />)

    expect(
      await screen.findByText('Опис ще не згенеровано для цього вузла.'),
    ).toBeInTheDocument()
  })

  it('handles a generic 404 (node gone) gracefully', async () => {
    editViewMock.mockRejectedValue(
      new ApiError(404, 'x', { detail: 'Node not found' }),
    )
    notYetMock.mockReturnValue(null)
    render(<SummaryModal nodeId="node-1" onClose={vi.fn()} onChanged={vi.fn()} />)

    expect(
      await screen.findByText('Опис недоступний — вузол не знайдено.'),
    ).toBeInTheDocument()
  })
})
