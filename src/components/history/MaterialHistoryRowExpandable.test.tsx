import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const { listMock } = vi.hoisted(() => ({ listMock: vi.fn() }))
vi.mock('../../api/jobs', () => ({ jobsApi: { list: listMock } }))

import { MaterialHistoryRowExpandable } from './MaterialHistoryRowExpandable'
import type {
  JobListItemResponse,
  MaterialHistoryItemResponse,
} from '../../types/api'

const NOW = Date.parse('2026-08-08T12:00:00Z')

function wjob(id: string): JobListItemResponse {
  return {
    id,
    job_type: 'document_processing',
    job_state: 'ready',
    queued_at: '2026-08-07T10:00:00Z',
    started_at: null,
    completed_at: '2026-08-07T10:05:00Z',
    subject_type: 'authored_document',
    subject_id: 's',
    material_id: 'm',
    display_name: `work-${id}`,
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: 'video',
    base_version: null,
    current_stage: null,
    stage_progress: null,
  }
}

function item(
  id: string,
  over: Partial<MaterialHistoryItemResponse> = {},
): MaterialHistoryItemResponse {
  return {
    material_id: id,
    display_name: `mat-${id}`,
    material_deleted: false,
    material_deleted_at: null,
    material_source_type: 'video',
    processing_phase: 'ready',
    last_job: wjob('last'),
    jobs_count: 1,
    ...over,
  }
}

function renderRows(...items: MaterialHistoryItemResponse[]) {
  return render(
    <table>
      <tbody>
        {items.map((it) => (
          <MaterialHistoryRowExpandable key={it.material_id} item={it} now={NOW} />
        ))}
      </tbody>
    </table>,
  )
}

const workJobs = (n: number) =>
  Array.from({ length: n }, (_, i) => wjob(`w${i}`))
const listResponse = (n: number) => ({
  items: workJobs(n),
  total: n,
  limit: n,
  offset: 0,
})

describe('MaterialHistoryRowExpandable — fetch on expand, not on render (§3 c6, clar.3)', () => {
  beforeEach(() => listMock.mockReset())

  it('makes zero door requests until expanded — twenty rows, no fetch on render', async () => {
    listMock.mockResolvedValue(listResponse(0))
    renderRows(...Array.from({ length: 20 }, (_, i) => item(String(i))))
    await screen.findByText('mat-0')
    expect(listMock).toHaveBeenCalledTimes(0)
  })

  it('fetches once per row on first expand, reuses the cache on re-expand', async () => {
    listMock.mockResolvedValue(listResponse(1))
    renderRows(item('A'), item('B'))
    const toggleA = () => screen.getByRole('button', { name: /mat-A/ })
    const toggleB = () => screen.getByRole('button', { name: /mat-B/ })

    expect(listMock).toHaveBeenCalledTimes(0)
    fireEvent.click(toggleA())
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1))
    expect(listMock).toHaveBeenLastCalledWith({ material_id: 'A', limit: 1 })

    fireEvent.click(toggleB()) // a distinct row → its own request
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2))
    expect(listMock).toHaveBeenLastCalledWith({ material_id: 'B', limit: 1 })

    fireEvent.click(toggleA()) // collapse A
    fireEvent.click(toggleA()) // re-expand A → cache reused, no new request
    expect(listMock).toHaveBeenCalledTimes(2)
  })
})

describe('MaterialHistoryRowExpandable — count reconciliation, two-sided control (§3 c6, clar.4)', () => {
  beforeEach(() => listMock.mockReset())

  it('renders exactly the promised number of work rows', async () => {
    listMock.mockResolvedValue(listResponse(3))
    renderRows(item('m', { jobs_count: 3 }))
    fireEvent.click(screen.getByRole('button', { name: /mat-m/ }))
    await waitFor(() =>
      expect(screen.getAllByTestId('work-row')).toHaveLength(3),
    )
    // reconciliation: rendered rows === the promised jobs_count
    expect(screen.getAllByTestId('work-row')).toHaveLength(3)
  })

  it('positive control — FEWER than promised is observable (a "=== jobs_count" check reddens)', async () => {
    listMock.mockResolvedValue(listResponse(2))
    renderRows(item('m', { jobs_count: 3 })) // promises 3, door gives 2
    fireEvent.click(screen.getByRole('button', { name: /mat-m/ }))
    await waitFor(() =>
      expect(screen.getAllByTestId('work-row')).toHaveLength(2),
    )
    expect(screen.getAllByTestId('work-row').length).not.toBe(3) // 2 ≠ 3 — detector fires
  })

  it('positive control — MORE than promised is observable (a "=== jobs_count" check reddens)', async () => {
    listMock.mockResolvedValue(listResponse(4))
    renderRows(item('m', { jobs_count: 3 })) // promises 3, door gives 4
    fireEvent.click(screen.getByRole('button', { name: /mat-m/ }))
    await waitFor(() =>
      expect(screen.getAllByTestId('work-row')).toHaveLength(4),
    )
    expect(screen.getAllByTestId('work-row').length).not.toBe(3) // 4 ≠ 3 — detector fires
  })
})

describe('MaterialHistoryRowExpandable — ceiling and error (§3 c6, Г6/clar.1)', () => {
  beforeEach(() => listMock.mockReset())

  it('over the ceiling: asks for 200 (not the promised 250), renders 200, and says so', async () => {
    listMock.mockResolvedValue({ items: workJobs(200), total: 200, limit: 200, offset: 0 })
    renderRows(item('big', { jobs_count: 250 }))
    fireEvent.click(screen.getByRole('button', { name: /mat-big/ }))
    await waitFor(() =>
      expect(screen.getAllByTestId('work-row')).toHaveLength(200),
    )
    expect(listMock).toHaveBeenLastCalledWith({ material_id: 'big', limit: 200 })
    expect(screen.getByText(/Показано перші 200 з 250/)).toBeInTheDocument()
  })

  it('shows an expansion error with a retry that recovers', async () => {
    listMock
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(listResponse(1))
    renderRows(item('x', { jobs_count: 1 }))
    fireEvent.click(screen.getByRole('button', { name: /mat-x/ }))
    const retry = await screen.findByText(/повторити/i)
    fireEvent.click(retry)
    await waitFor(() =>
      expect(screen.getAllByTestId('work-row')).toHaveLength(1),
    )
  })
})
