import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the door client to break the transitive auth-store import and assert the
// call shape (project convention — no msw).
const { historyMock } = vi.hoisted(() => ({ historyMock: vi.fn() }))
vi.mock('../api/jobs', () => ({ jobsApi: { history: historyMock } }))

import { HistoryPage } from './HistoryPage'
import type {
  MaterialHistoryItemResponse,
  MaterialHistoryResponse,
} from '../types/api'

function item(id: string): MaterialHistoryItemResponse {
  return {
    material_id: id,
    display_name: `mat-${id}`,
    material_deleted: false,
    material_deleted_at: null,
    material_source_type: 'video',
    processing_phase: 'ready',
    last_job: {
      id: `j-${id}`,
      job_type: 'document_processing',
      job_state: 'ready',
      queued_at: '2026-08-07T10:00:00Z',
      started_at: null,
      completed_at: '2026-08-07T10:05:00Z',
      subject_type: 'authored_document',
      subject_id: id,
      material_id: id,
      display_name: `mat-${id}`,
      display_deleted: false,
      display_deleted_at: null,
      material_source_type: 'video',
      base_version: null,
      current_stage: null,
      stage_progress: null,
    },
    jobs_count: 1,
  }
}

function page(
  items: MaterialHistoryItemResponse[],
  total: number,
  offset = 0,
): MaterialHistoryResponse {
  return { items, total, limit: 20, offset }
}

describe('HistoryPage', () => {
  beforeEach(() => historyMock.mockReset())

  it('shows a calm empty state (not a failure) when history is empty', async () => {
    historyMock.mockResolvedValue(page([], 0))
    render(<HistoryPage />)
    expect(await screen.findByText('Історія порожня')).toBeInTheDocument()
  })

  it('shows an error with a retry that recovers', async () => {
    historyMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(page([item('1')], 1))
    render(<HistoryPage />)
    expect(await screen.findByText('network')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Повторити' }))
    expect(await screen.findByText('mat-1')).toBeInTheDocument()
  })

  it('shows the total straight from the response field', async () => {
    historyMock.mockResolvedValue(page([item('1'), item('2')], 42))
    render(<HistoryPage />)
    expect(await screen.findByText('Матеріалів: 42')).toBeInTheDocument()
  })

  it('pages forward and back, asking the door for the right offset', async () => {
    historyMock.mockResolvedValue(page([item('1')], 100)) // total 100 → more pages
    render(<HistoryPage />)
    await screen.findByText('mat-1')
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Далі' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Далі' }))
    await waitFor(() => expect(historyMock).toHaveBeenLastCalledWith(20, 20))
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    await waitFor(() => expect(historyMock).toHaveBeenLastCalledWith(20, 0))
  })

  it('disables both controls on a single last page (bounds)', async () => {
    historyMock.mockResolvedValue(page([item('1')], 1)) // total 1 ≤ page → only page
    render(<HistoryPage />)
    await screen.findByText('mat-1')
    expect(screen.getByRole('button', { name: 'Назад' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled()
  })

  it('clamps back to a valid page when the offset lands past the end (clarification 4)', async () => {
    historyMock
      .mockResolvedValueOnce(page([item('a')], 100)) // page 1, more pages
      .mockResolvedValueOnce(page([], 5, 20)) // page 2 now empty — list shrank to 5
      .mockResolvedValueOnce(page([item('b')], 5)) // clamped back to page 1
    render(<HistoryPage />)
    await screen.findByText('mat-a')
    fireEvent.click(screen.getByRole('button', { name: 'Далі' })) // → offset 20, past end
    // Defined behavior: jump back to a page that exists, no blank screen.
    await waitFor(() => expect(historyMock).toHaveBeenLastCalledWith(20, 0))
    expect(await screen.findByText('mat-b')).toBeInTheDocument()
  })
})
