import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { AuthorEstimateResponse, NodeWithDocuments } from '../types/api'
import { useCourseStore } from '../stores/course'
import { CoursePage } from './CoursePage'
import { ApiError } from '../api/client'

const { getDetailMock, generateMock, estimateNodeSummaryMock } = vi.hoisted(() => ({
  getDetailMock: vi.fn(),
  generateMock: vi.fn(),
  estimateNodeSummaryMock: vi.fn(),
}))

vi.mock('../api/nodes', () => ({ nodesApi: { getDetail: getDetailMock } }))
vi.mock('../api/enrollment-link', () => ({
  enrollmentLinkApi: {
    get: vi.fn(() => Promise.resolve({ open: false, key: null, url: null })),
  },
}))
vi.mock('../api/node-summary', async (importOriginal) => {
  const real = await importOriginal<typeof import('../api/node-summary')>()
  return { ...real, summaryApi: { ...real.summaryApi, generate: generateMock } }
})
vi.mock('../api/billing', async (importOriginal) => {
  const real = await importOriginal<typeof import('../api/billing')>()
  return { ...real, estimateNodeSummary: estimateNodeSummaryMock }
})

vi.mock('../components/flow/CourseCanvas', () => ({
  CourseCanvas: ({ onGenerate }: { onGenerate: (id: string, title: string) => void }) => (
    <button
      data-testid="canvas-generate-btn"
      onClick={() => onGenerate('node-7', 'Розділ 3')}
    >
      Generate
    </button>
  ),
}))
vi.mock('../components/flow/NodeDetailPanel', () => ({
  NodeDetailPanel: () => <div data-testid="node-detail-panel" />,
}))
vi.mock('../components/flow/RunStatePanel', () => ({ RunStatePanel: () => null }))
vi.mock('../components/flow/RejectionNotice', () => ({
  RejectionNotice: ({
    onRetryForce,
    nodeTitle,
  }: {
    onRetryForce: () => void
    nodeTitle: string
  }) => (
    <div data-testid="rejection-notice">
      <span>{nodeTitle}</span>
      <button data-testid="rejection-retry-force" onClick={onRetryForce}>
        Retry Force
      </button>
    </div>
  ),
}))
vi.mock('../components/flow/SummaryModal', () => ({ SummaryModal: () => null }))

const ENOUGH: AuthorEstimateResponse = {
  price_units: 15,
  available_units: 100,
  enough: true,
  missing_units: null,
  charging_enabled: true,
}

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
    generateMock.mockReset()
    estimateNodeSummaryMock.mockReset().mockResolvedValue(ENOUGH)
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

describe('CoursePage — запуск Методиста через діалог (Г-27)', () => {
  beforeEach(() => {
    getDetailMock.mockReset()
    generateMock.mockReset()
    estimateNodeSummaryMock.mockReset().mockResolvedValue(ENOUGH)
    useCourseStore.getState().reset()
  })

  it('пункт меню відкриває діалог, generate викликається лише після «Запустити» з force=false', async () => {
    getDetailMock.mockResolvedValue(makeNode('root-1', [makeNode('node-7')]))
    generateMock.mockResolvedValue({ id: 'job-1', job_state: 'queued' })

    renderAt('/course/root-1')
    await waitFor(() => expect(screen.getByTestId('canvas-generate-btn')).toBeInTheDocument())

    // Клік на дію генерації не викликає generate одразу, а відкриває діалог
    fireEvent.click(screen.getByTestId('canvas-generate-btn'))
    expect(screen.getByText('Запустити Методиста?')).toBeInTheDocument()
    expect(generateMock).not.toHaveBeenCalled()

    // Натискаємо «Запустити» в діалозі
    const startBtn = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => expect(startBtn).toBeEnabled())
    fireEvent.click(startBtn)

    await waitFor(() => {
      expect(generateMock).toHaveBeenCalledExactlyOnceWith('node-7', false)
    })
  })

  it('«Скасувати» в діалозі не викликає generate', async () => {
    getDetailMock.mockResolvedValue(makeNode('root-1', [makeNode('node-7')]))

    renderAt('/course/root-1')
    await waitFor(() => expect(screen.getByTestId('canvas-generate-btn')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('canvas-generate-btn'))
    expect(screen.getByText('Запустити Методиста?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
    expect(screen.queryByText('Запустити Методиста?')).toBeNull()
    expect(generateMock).not.toHaveBeenCalled()
  })

  it('«примусово» з RejectionNotice відкриває діалог з force=true, і generate викликається лише після «Запустити»', async () => {
    getDetailMock.mockResolvedValue(makeNode('root-1', [makeNode('node-7')]))
    const err422 = new ApiError(422, 'Uncovered stale nodes', {
      detail: {
        reason: 'uncovered_stale_nodes',
        uncovered_stale_node_ids: ['stale-node-1'],
        in_scope_node_ids: ['node-7'],
      },
    })
    generateMock
      .mockRejectedValueOnce(err422)
      .mockResolvedValueOnce({ id: 'job-force', job_state: 'queued' })

    renderAt('/course/root-1')
    await waitFor(() => expect(screen.getByTestId('canvas-generate-btn')).toBeInTheDocument())

    // Перший запуск (force=false) отримує 422
    fireEvent.click(screen.getByTestId('canvas-generate-btn'))
    const startBtn1 = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => expect(startBtn1).toBeEnabled())
    fireEvent.click(startBtn1)

    // З'являється RejectionNotice
    await waitFor(() => expect(screen.getByTestId('rejection-notice')).toBeInTheDocument())
    expect(generateMock).toHaveBeenCalledWith('node-7', false)
    generateMock.mockClear()

    // Натискаємо Retry Force в RejectionNotice — відкривається діалог
    fireEvent.click(screen.getByTestId('rejection-retry-force'))
    expect(screen.getByText('Запустити Методиста?')).toBeInTheDocument()
    expect(generateMock).not.toHaveBeenCalled()

    // В діалозі оцінка викликається з force=true
    expect(estimateNodeSummaryMock).toHaveBeenCalledWith('node-7', true)

    // Натискаємо «Запустити»
    const startBtn2 = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => expect(startBtn2).toBeEnabled())
    fireEvent.click(startBtn2)

    await waitFor(() => {
      expect(generateMock).toHaveBeenCalledExactlyOnceWith('node-7', true)
    })
  })
})
