import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaterialHistoryRow } from './MaterialHistoryRow'
import type {
  JobListItemResponse,
  MaterialHistoryItemResponse,
} from '../../types/api'

const NOW = Date.parse('2026-08-08T12:00:00Z')

function lastJob(over: Partial<JobListItemResponse> = {}): JobListItemResponse {
  return {
    id: 'j-1',
    job_type: 'document_processing',
    job_state: 'ready',
    queued_at: '2026-08-07T10:00:00Z',
    started_at: null,
    completed_at: '2026-08-07T10:05:00Z',
    subject_type: 'authored_document',
    subject_id: 's',
    material_id: 'm',
    display_name: 'lecture.mp4',
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: 'video',
    base_version: null,
    current_stage: null,
    stage_progress: null,
    ...over,
  }
}

function item(
  over: Partial<MaterialHistoryItemResponse> = {},
): MaterialHistoryItemResponse {
  return {
    material_id: 'm',
    display_name: 'lecture.mp4',
    material_deleted: false,
    material_deleted_at: null,
    material_source_type: 'video',
    processing_phase: 'ready',
    last_job: lastJob(),
    jobs_count: 3,
    ...over,
  }
}

function renderRow(it: MaterialHistoryItemResponse) {
  return render(
    <table>
      <tbody>
        <MaterialHistoryRow item={it} now={NOW} />
      </tbody>
    </table>,
  )
}

describe('MaterialHistoryRow — three composition cases (§3 c4, Г2/Г7)', () => {
  it('live + named: shows the name and a phase chip', () => {
    renderRow(item({ material_deleted: false, display_name: 'lecture.mp4' }))
    expect(screen.getByText('lecture.mp4')).toBeInTheDocument()
    expect(screen.getByTestId('phase-chip')).toBeInTheDocument()
  })

  it('live + unnamed: shows "Без назви" (not the deleted label) and keeps the chip', () => {
    renderRow(item({ material_deleted: false, display_name: null }))
    expect(screen.getByText('Без назви')).toBeInTheDocument()
    expect(screen.queryByText(/Матеріал видалено/)).toBeNull()
    expect(screen.getByTestId('phase-chip')).toBeInTheDocument()
  })

  it('deleted with a null name: still the deleted label — split by the flag, not the name (Г7)', () => {
    renderRow(
      item({
        material_deleted: true,
        material_deleted_at: '2026-08-08T12:00:00Z',
        display_name: null,
        processing_phase: null,
      }),
    )
    expect(screen.getByText(/^Матеріал видалено автором /)).toBeInTheDocument()
    expect(screen.queryByText('Без назви')).toBeNull()
  })
})

describe('MaterialHistoryRow — a deleted material has NO phase-chip node (§3 c4, Г2/Г3)', () => {
  it('renders no phase-chip node at all — absence, not an empty container', () => {
    renderRow(
      item({
        material_deleted: true,
        material_deleted_at: '2026-08-08T12:00:00Z',
        processing_phase: null,
      }),
    )
    // Absence of the NODE, not absence of text inside it: an empty container that
    // still holds width reads as "something failed to load" (Г2).
    expect(screen.queryByTestId('phase-chip')).toBeNull()
  })

  it('still shows the source-type icon — the recognition anchor for a deleted material (Р7)', () => {
    renderRow(
      item({
        material_deleted: true,
        material_deleted_at: '2026-08-08T12:00:00Z',
        processing_phase: null,
        material_source_type: 'audio',
      }),
    )
    expect(screen.getByRole('img', { name: 'Аудіо' })).toBeInTheDocument()
  })
})

describe('MaterialHistoryRow — two axes stay on different carriers (§3 c4, В1)', () => {
  it('phase is a filled chip, the last work-state a bare word — a merge would redden this', () => {
    // Material ready, last work cancelled — the readable case ARC §7 names.
    renderRow(
      item({
        processing_phase: 'ready',
        last_job: lastJob({ job_state: 'cancelled' }),
      }),
    )
    const chip = screen.getByText('Готово') // phase → material → filled chip
    const word = screen.getByText('Скасовано') // work-state → work → bare word
    expect(chip).not.toBe(word)
    expect(chip.className).toMatch(/bg-/) // the chip carries a fill
    expect(word.className).not.toMatch(/bg-/) // the word never does (a merge adds bg-)
  })
})

describe('MaterialHistoryRow — chip has its own column (§3 Г8 п.5)', () => {
  it('renders the phase chip OUTSIDE the material/name cell, so names align', () => {
    const { container } = renderRow(
      item({ display_name: 'lecture.mp4', processing_phase: 'ready' }),
    )
    const chip = container.querySelector('[data-testid="phase-chip"]')!
    const nameCell = [...container.querySelectorAll('tbody td')].find((c) =>
      c.textContent?.includes('lecture.mp4'),
    )!
    expect(chip).toBeInTheDocument()
    // The chip lives in its own column — never inside the name cell (a chip in the
    // name flow is what made the left edge ragged; Г8 п.5).
    expect(nameCell.contains(chip)).toBe(false)
  })
})
