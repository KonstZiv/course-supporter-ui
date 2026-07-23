import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NodeDetailPanel } from './NodeDetailPanel'
import { useCourseStore } from '../../stores/course'
import type { AuthoredDocumentSummary, NodeWithDocuments } from '../../types/api'

// NodeDetailPanel now calls useNavigate for the awaiting_author confirm entry —
// mock it so the bare render (no Router) works and the target is assertable.
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

function makeNode(overrides: Partial<NodeWithDocuments> = {}): NodeWithDocuments {
  return {
    id: 'node-1',
    parent_id: null,
    title: 'Node',
    description: null,
    default_language: 'ukr',
    order: 0,
    content_hash: null,
    summary_status: 'none',
    materials_changed: false,
    authored_documents: [],
    children: [],
    ...overrides,
  }
}

function seed(node: NodeWithDocuments): void {
  useCourseStore.setState({
    tree: node,
    selectedNodeId: node.id,
    loading: false,
    error: null,
  })
}

function makeDoc(
  overrides: Partial<AuthoredDocumentSummary> = {},
): AuthoredDocumentSummary {
  return {
    id: 'doc-1',
    course_node_id: 'node-1',
    source_type: 'code',
    material_role: 'educational',
    task_type: null,
    order: 0,
    filename: 'lesson.zip',
    source_url: 's3://bucket/lesson.zip',
    language: 'ukr',
    state: 'ready',
    processing_phase: 'awaiting_author',
    content_fingerprint: null,
    error_message: null,
    error_category: null,
    created_at: '',
    ...overrides,
  }
}

describe('NodeDetailPanel — summary affordance (Task 3.2.5b c2)', () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
  })

  const LABEL = 'Переглянути/редагувати опис'

  it('hides the review/edit button when summary_status is "none"', () => {
    seed(makeNode({ summary_status: 'none' }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument()
  })

  it('shows the button for a draft summary', () => {
    seed(makeNode({ summary_status: 'draft' }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText(LABEL)).toBeInTheDocument()
  })

  it('shows the button for an approved summary', () => {
    seed(makeNode({ summary_status: 'approved' }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText(LABEL)).toBeInTheDocument()
  })

  it('lifts the node id + title to onOpenSummary on click', () => {
    const onOpen = vi.fn()
    seed(
      makeNode({ id: 'node-xyz', title: 'Вузол XYZ', summary_status: 'approved' }),
    )
    render(<NodeDetailPanel onOpenSummary={onOpen} />)
    fireEvent.click(screen.getByText(LABEL))
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('node-xyz', 'Вузол XYZ')
  })
})

describe('NodeDetailPanel — awaiting_author entry (№21 UI2)', () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
    navigateMock.mockReset()
  })

  it('shows the awaiting-author badge and a confirm entry for that phase', () => {
    seed(makeNode({ authored_documents: [makeDoc()] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText('Очікує підтвердження')).toBeInTheDocument()
    expect(screen.getByText('Підтвердити ролі')).toBeInTheDocument()
  })

  it('navigates to the confirm screen on click', () => {
    seed(makeNode({ authored_documents: [makeDoc({ id: 'doc-xyz' })] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.click(screen.getByText('Підтвердити ролі'))
    expect(navigateMock).toHaveBeenCalledWith('/document/doc-xyz/confirm-roles')
  })

  it('shows no confirm entry for a non-awaiting document (tolerance)', () => {
    seed(
      makeNode({
        authored_documents: [
          makeDoc({ state: 'ready', processing_phase: 'ready' }),
        ],
      }),
    )
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(screen.queryByText('Підтвердити ролі')).not.toBeInTheDocument()
  })
})
