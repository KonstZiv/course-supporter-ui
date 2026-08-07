import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityStrip } from './ActivityStrip'
import type { JobListItemResponse, JobState } from '../../types/api'

// Timestamps relative to real ``now`` so the component's own ``Date.now()`` puts
// them inside the three-day detailed window regardless of the wall clock.
const NOW = Date.now()
function ago(ms: number): string {
  return new Date(NOW - ms).toISOString()
}
const MIN = 60_000

let seq = 0
function job(
  job_state: JobState,
  over: Partial<JobListItemResponse> = {},
): JobListItemResponse {
  seq += 1
  const live = job_state === 'queued' || job_state === 'processing'
  return {
    id: `j-${seq}`,
    job_type: 'document_processing',
    job_state,
    queued_at: ago(5 * MIN),
    started_at: null,
    completed_at: live ? null : ago(MIN),
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

describe('ActivityStrip', () => {
  it('renders nothing when there is no live and no recent work (empty state)', () => {
    const { container } = render(<ActivityStrip items={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the newest live job as a word + subject; the word moves, no filled chip (§3)', () => {
    render(<ActivityStrip items={[job('processing', { display_name: 'a.mp4' })]} />)
    const word = screen.getByText('Обробляється')
    expect(word).toBeInTheDocument()
    expect(screen.getByText('a.mp4')).toBeInTheDocument()
    expect(word.className).toContain('animate-pulse-soft')
    expect(word.className).not.toContain('bg-')
  })

  it('shows "і ще N" from the loaded list beyond the single headline', () => {
    render(
      <ActivityStrip
        items={[job('processing'), job('ready'), job('ready')]}
      />,
    )
    expect(screen.getByText(/і ще 2/)).toBeInTheDocument()
  })

  it('opens the detailed panel with rows on click', () => {
    render(
      <ActivityStrip
        items={[
          job('processing', { display_name: 'a.mp4' }),
          job('ready', { display_name: 'b.txt', material_source_type: 'text' }),
        ]}
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // A detailed row the collapsed headline did not show.
    expect(screen.getByText('b.txt')).toBeInTheDocument()
  })

  it('speaks an error headline in the alarm colour as text, never a chip', () => {
    render(<ActivityStrip items={[job('error', { display_name: 'bad.mp4' })]} />)
    const word = screen.getByText('Помилка')
    expect(word.className).toContain('text-coral')
    expect(word.className).not.toContain('bg-')
  })
})
