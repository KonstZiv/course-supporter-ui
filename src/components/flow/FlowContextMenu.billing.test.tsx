import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type {
  AuthorEstimateResponse,
  AuthoredDocumentResponse,
  NodeWithDocuments,
} from '../../types/api'

// The canvas menu with units (BIL-E): «Обробити матеріали» (place 4б — one
// line for the node, not one per material) and the upload (place 2).
const api = vi.hoisted(() => ({ estimateProcessing: vi.fn() }))
vi.mock('../../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/billing')>()),
  ...api,
}))

import { FlowContextMenu } from './FlowContextMenu'
import { documentsApi } from '../../api/documents'
import { nodesApi } from '../../api/nodes'
import { useCourseStore } from '../../stores/course'

// A retry is asked with the kind alone: the server answers without a price.
const ON: AuthorEstimateResponse = {
  price_units: null,
  available_units: 300,
  enough: true,
  missing_units: null,
  charging_enabled: true,
  unpriced_reason: 'missing_features',
  missing_features: ['duration_sec'],
}
const OFF: AuthorEstimateResponse = { ...ON, available_units: null, charging_enabled: false }

function failed(id: string, source_type: AuthoredDocumentResponse['source_type']) {
  return {
    id,
    course_node_id: 'n1',
    course_root_id: 'root-1',
    source_type,
    material_role: 'educational',
    task_type: null,
    order: 0,
    filename: `${id}.bin`,
    title: null,
    source_url: `s3://bucket/${id}`,
    language: 'ukr',
    state: 'error',
    processing_phase: 'error',
    file_roles: null,
    job_id: null,
    error_message: 'x',
    error_category: 'insufficient_units',
    created_at: '',
    updated_at: '',
  } as AuthoredDocumentResponse
}

function renderMenu(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <FlowContextMenu
        position={{ x: 0, y: 0, nodeId: 'n1', nodeTitle: 'Розділ', isRoot: false }}
        onClose={onClose}
        onGenerate={vi.fn()}
      />
    </MemoryRouter>,
  )
  return onClose
}

beforeEach(() => {
  vi.clearAllMocks()
  useCourseStore.setState({ tree: { id: 'root-1' } as NodeWithDocuments })
  vi.spyOn(nodesApi, 'getDetail').mockResolvedValue({ id: 'root-1' } as NodeWithDocuments)
})
afterEach(() => {
  useCourseStore.getState().reset()
  vi.restoreAllMocks()
})

describe('«Обробити матеріали» (place 4б)', () => {
  it('charging off → the failed ones start at once, as before', async () => {
    api.estimateProcessing.mockResolvedValue(OFF)
    vi.spyOn(documentsApi, 'list').mockResolvedValue([failed('a', 'video'), failed('b', 'web')])
    const retry = vi.spyOn(documentsApi, 'retry').mockResolvedValue({ job_id: 'j' })
    const onClose = renderMenu()
    fireEvent.click(screen.getByText('Обробити матеріали'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(retry).toHaveBeenCalledTimes(2)
    expect(api.estimateProcessing).toHaveBeenCalledExactlyOnceWith('n1', { kind: 'video' })
  })

  it('charging on → one line for the node, then «Обробити» starts them all', async () => {
    api.estimateProcessing.mockResolvedValue(ON)
    vi.spyOn(documentsApi, 'list').mockResolvedValue([failed('a', 'video'), failed('b', 'web')])
    const retry = vi.spyOn(documentsApi, 'retry').mockResolvedValue({ job_id: 'j' })
    const onClose = renderMenu()
    fireEvent.click(screen.getByText('Обробити матеріали'))
    const dialog = await screen.findByRole('dialog', { name: 'Обробити матеріали' })
    expect(
      within(dialog).getByText(
        'Орієнтовну вартість цих матеріалів до обробки порахувати не вдалося.',
      ),
    ).toBeInTheDocument()
    expect(api.estimateProcessing).toHaveBeenCalledTimes(1)
    expect(retry).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Обробити' }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(retry.mock.calls.map((c) => c[0])).toEqual(['a', 'b'])
  })

  it('one failed material: the line of one material; «Скасувати» starts nothing', async () => {
    api.estimateProcessing.mockResolvedValue(ON)
    vi.spyOn(documentsApi, 'list').mockResolvedValue([failed('a', 'audio')])
    const retry = vi.spyOn(documentsApi, 'retry')
    renderMenu()
    fireEvent.click(screen.getByText('Обробити матеріали'))
    const dialog = await screen.findByRole('dialog', { name: 'Обробити матеріали' })
    expect(
      within(dialog).getByText(
        'Орієнтовну вартість цього матеріалу до обробки порахувати не вдалося.',
      ),
    ).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
    expect(retry).not.toHaveBeenCalled()
  })

  it('the request failed → its line in the confirmation', async () => {
    api.estimateProcessing.mockRejectedValue(new TypeError('Failed to fetch'))
    vi.spyOn(documentsApi, 'list').mockResolvedValue([failed('a', 'text')])
    renderMenu()
    fireEvent.click(screen.getByText('Обробити матеріали'))
    const dialog = await screen.findByRole('dialog', { name: 'Обробити матеріали' })
    expect(
      within(dialog).getByText('Орієнтовну вартість зараз порахувати не вдалося.'),
    ).toBeInTheDocument()
  })
})

describe('the upload from the menu (place 2)', () => {
  it('the dialog prices the chosen file for this node', async () => {
    api.estimateProcessing.mockResolvedValue({
      price_units: 50,
      available_units: 1000,
      enough: true,
      missing_units: null,
      charging_enabled: true,
    })
    const file = new File(['Змінні'], 'notes.md', { type: 'text/markdown' })
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      Object.defineProperty(this, 'files', { value: [file] })
      void (this.onchange as ((e: Event) => unknown) | null)?.(new Event('change'))
    })
    renderMenu()
    fireEvent.click(screen.getByText('Завантажити матеріал'))
    fireEvent.click(await screen.findByText('Навчальний'))
    expect(await screen.findByTestId('price-card')).toHaveTextContent(
      'Орієнтовна вартість: приблизно 50 юнітів. У вас доступно 1 000 юнітів.',
    )
    expect(api.estimateProcessing).toHaveBeenCalledWith('n1', {
      kind: 'text',
      text_chars: 6,
    })
  })
})
