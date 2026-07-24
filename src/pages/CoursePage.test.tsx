import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { NodeWithDocuments } from '../types/api'
import { useCourseStore } from '../stores/course'
import { CoursePage } from './CoursePage'

// The flow canvas and its panels pull in @xyflow/react (needs a provider) and a
// polling hook — irrelevant to the ?selected preselect. Stub them; the panel is
// a marker so its presence == "detail panel open". The real store drives it.
const { getDetailMock } = vi.hoisted(() => ({ getDetailMock: vi.fn() }))
vi.mock('../api/nodes', () => ({ nodesApi: { getDetail: getDetailMock } }))
vi.mock('../hooks/useJobPolling', () => ({ useJobPolling: () => null }))
vi.mock('../components/flow/CourseCanvas', () => ({ CourseCanvas: () => null }))
vi.mock('../components/flow/NodeDetailPanel', () => ({
  NodeDetailPanel: () => <div data-testid="node-detail-panel" />,
}))
vi.mock('../components/flow/RunStatePanel', () => ({ RunStatePanel: () => null }))
vi.mock('../components/flow/RejectionNotice', () => ({
  RejectionNotice: () => null,
}))
vi.mock('../components/flow/SummaryModal', () => ({ SummaryModal: () => null }))

function makeNode(
  id: string,
  children: NodeWithDocuments[] = [],
): NodeWithDocuments {
  return {
    id,
    parent_id: null,
    title: id,
    description: null,
    default_language: 'ukr',
    order: 0,
    content_hash: null,
    summary_status: 'none',
    materials_changed: false,
    authored_documents: [],
    children,
  }
}

function renderAt(url: string): void {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/course/:nodeId" element={<CoursePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CoursePage — ?selected preselect (A-UI-2)', () => {
  beforeEach(() => {
    getDetailMock.mockReset()
    useCourseStore.getState().reset()
  })

  it('opens the detail panel for a selected node present in the tree', async () => {
    getDetailMock.mockResolvedValue(makeNode('root-1', [makeNode('section-1')]))
    renderAt('/course/root-1?selected=section-1')
    await waitFor(() =>
      expect(useCourseStore.getState().selectedNodeId).toBe('section-1'),
    )
    expect(screen.getByTestId('node-detail-panel')).toBeInTheDocument()
  })

  it('silently ignores a selected id absent from the tree', async () => {
    getDetailMock.mockResolvedValue(makeNode('root-1', [makeNode('section-1')]))
    renderAt('/course/root-1?selected=ghost')
    // The tree title renders once loaded; nothing threw, and no node is selected.
    await waitFor(() => expect(screen.getByText('root-1')).toBeInTheDocument())
    expect(useCourseStore.getState().selectedNodeId).toBeNull()
    expect(screen.queryByTestId('node-detail-panel')).toBeNull()
  })

  it('does nothing without a selected param', async () => {
    getDetailMock.mockResolvedValue(makeNode('root-1', [makeNode('section-1')]))
    renderAt('/course/root-1')
    await waitFor(() => expect(screen.getByText('root-1')).toBeInTheDocument())
    expect(useCourseStore.getState().selectedNodeId).toBeNull()
  })
})
