import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NodeDetailPanel } from './NodeDetailPanel'
import { useCourseStore } from '../../stores/course'
import type { NodeWithDocuments } from '../../types/api'

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

  it('lifts the node id to onOpenSummary on click', () => {
    const onOpen = vi.fn()
    seed(makeNode({ id: 'node-xyz', summary_status: 'approved' }))
    render(<NodeDetailPanel onOpenSummary={onOpen} />)
    fireEvent.click(screen.getByText(LABEL))
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('node-xyz')
  })
})
