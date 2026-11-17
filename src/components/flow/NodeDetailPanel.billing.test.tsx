import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type {
  AuthorEstimateResponse,
  AuthoredDocumentSummary,
  NodeWithDocuments,
} from '../../types/api'

// The material card and its actions with units (BIL-E): a processing stopped
// for want of units (5.3), the retry (place 4) and the upload (place 1).
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => vi.fn(),
}))
vi.mock('../../api/documents', () => ({
  documentsApi: {
    upload: vi.fn(),
    uploadUrl: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    retry: vi.fn(),
    update: vi.fn(),
    getStructure: vi.fn().mockResolvedValue({ excluded: [], description_only: [] }),
  },
}))
const api = vi.hoisted(() => ({ estimateProcessing: vi.fn() }))
vi.mock('../../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/billing')>()),
  ...api,
}))

import { NodeDetailPanel } from './NodeDetailPanel'
import { useCourseStore } from '../../stores/course'
import { documentsApi } from '../../api/documents'
import { nodesApi } from '../../api/nodes'

// A retry is asked with the kind alone: the server answers without a price.
const ON_UNPRICED: AuthorEstimateResponse = {
  price_units: null,
  available_units: 300,
  enough: true,
  missing_units: null,
  charging_enabled: true,
  unpriced_reason: 'missing_features',
  missing_features: ['duration_sec'],
}
const OFF: AuthorEstimateResponse = {
  ...ON_UNPRICED,
  available_units: null,
  charging_enabled: false,
}

const INSUFFICIENT_TEXT =
  'Обробку не почато: на неї не вистачило юнітів. Матеріал збережено — після купівлі юнітів запустіть обробку ще раз.'

function makeDoc(over: Partial<AuthoredDocumentSummary> = {}): AuthoredDocumentSummary {
  return {
    id: 'doc-1',
    course_node_id: 'node-1',
    source_type: 'video',
    material_role: 'educational',
    task_type: null,
    order: 0,
    filename: 'lecture.mp4',
    title: null,
    source_url: 's3://bucket/lecture.mp4',
    language: 'ukr',
    state: 'error',
    processing_phase: 'error',
    content_fingerprint: null,
    error_message: 'insufficient_units: the price is 120 units, 40 are available',
    error_category: 'insufficient_units',
    created_at: '',
    ...over,
  }
}

function seed(docs: AuthoredDocumentSummary[]): void {
  const node: NodeWithDocuments = {
    id: 'node-1',
    parent_id: null,
    title: 'Node',
    description: null,
    default_language: 'ukr',
    order: 0,
    content_hash: null,
    summary_status: 'none',
    materials_changed: false,
    authored_documents: docs,
    children: [],
  }
  useCourseStore.setState({ tree: node, selectedNodeId: node.id, loading: false, error: null })
  vi.spyOn(nodesApi, 'getDetail').mockResolvedValue(node)
}

beforeEach(() => {
  vi.clearAllMocks()
  useCourseStore.getState().reset()
})

describe('a processing stopped for want of units (5.3)', () => {
  it('says so, and offers the purchase in a new tab beside the retry', () => {
    seed([makeDoc()])
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText(INSUFFICIENT_TEXT)).toBeInTheDocument()
    const buy = screen.getByRole('link', { name: 'Купити юніти' })
    expect(buy).toHaveAttribute('href', '/billing')
    expect(buy).toHaveAttribute('target', '_blank')
    // The retry stays as it was.
    expect(screen.getByRole('button', { name: 'Повторити обробку' })).toBeInTheDocument()
    // Not a fault to report: no letter to the administrator.
    expect(screen.queryByRole('button', { name: /адміністратор/ })).toBeNull()
  })

  it('another failure keeps its own words and no purchase', () => {
    seed([makeDoc({ error_category: 'empty_document' })])
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.queryByText(INSUFFICIENT_TEXT)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Купити юніти' })).toBeNull()
  })
})

describe('the retry (place 4): the price with the kind alone', () => {
  it('1: charging off → runs at once, as before', async () => {
    api.estimateProcessing.mockResolvedValue(OFF)
    vi.mocked(documentsApi.retry).mockResolvedValue({ job_id: 'j1' })
    seed([makeDoc()])
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Повторити обробку' }))
    await waitFor(() =>
      expect(documentsApi.retry).toHaveBeenCalledExactlyOnceWith('doc-1', false),
    )
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', { kind: 'video' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('3: charging on → the line in a confirmation, then «Запустити обробку»', async () => {
    api.estimateProcessing.mockResolvedValue(ON_UNPRICED)
    vi.mocked(documentsApi.retry).mockResolvedValue({ job_id: 'j1' })
    seed([makeDoc()])
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Повторити обробку' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Запустити обробку «lecture.mp4» ще раз?')).toBeInTheDocument()
    expect(
      within(dialog).getByText(
        'Орієнтовну вартість цього матеріалу до обробки порахувати не вдалося.',
      ),
    ).toBeInTheDocument()
    expect(documentsApi.retry).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Запустити обробку' }))
    await waitFor(() =>
      expect(documentsApi.retry).toHaveBeenCalledExactlyOnceWith('doc-1', false),
    )
  })

  it('2: the request failed → its line in the confirmation; «Скасувати» runs nothing', async () => {
    api.estimateProcessing.mockRejectedValue(new TypeError('Failed to fetch'))
    seed([makeDoc()])
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Повторити обробку' }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('Орієнтовну вартість зараз порахувати не вдалося.'),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
    expect(documentsApi.retry).not.toHaveBeenCalled()
  })

  it('a ready material: the reprocessing question with the line, then force', async () => {
    api.estimateProcessing.mockResolvedValue(ON_UNPRICED)
    vi.mocked(documentsApi.retry).mockResolvedValue({ job_id: 'j1' })
    seed([makeDoc({ state: 'ready', processing_phase: 'ready', error_category: null, error_message: null })])
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Перезапустити обробку (force)' }))
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(
        'Перезапустити обробку «lecture.mp4»? Поточний результат буде замінено новим.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Запустити обробку' }))
    await waitFor(() =>
      expect(documentsApi.retry).toHaveBeenCalledExactlyOnceWith('doc-1', true),
    )
  })
})

describe('the upload from the panel (place 1)', () => {
  it('not enough → nothing is sent', async () => {
    api.estimateProcessing.mockResolvedValue({
      price_units: 120,
      available_units: 40,
      enough: false,
      missing_units: 80,
      charging_enabled: true,
    })
    seed([])
    const { container } = render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    const picker = container.querySelectorAll('input[type=file]')[1]!
    fireEvent.change(picker, {
      target: { files: [new File(['Цикли'], 'notes.md', { type: 'text/markdown' })] },
    })
    fireEvent.click(await screen.findByText('Навчальний'))
    expect(
      await screen.findByText(
        'Ця дія коштує приблизно 120 юнітів, у вас 40 юнітів. Не вистачає 80 юнітів.',
      ),
    ).toBeInTheDocument()
    const upload = screen.getByRole('button', { name: 'Завантажити' })
    expect(upload).toBeDisabled()
    fireEvent.click(upload)
    expect(documentsApi.upload).not.toHaveBeenCalled()
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', {
      kind: 'text',
      text_chars: 5,
    })
  })
})
