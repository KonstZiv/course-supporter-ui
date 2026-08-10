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

  // The server scrubs a deleted material's name to a marker with a machine time;
  // the strip must not surface it — it reads the short label, not display_name.
  const SCRUB = 'інформація видалена автором 08-08-2026 14:30:00'

  it('shows a deleted material as the short label, never the server scrub marker (Г3)', () => {
    render(
      <ActivityStrip
        items={[
          job('ready', {
            display_deleted: true,
            display_deleted_at: ago(MIN),
            display_name: SCRUB,
          }),
        ]}
      />,
    )
    expect(screen.getByText('Матеріал видалено')).toBeInTheDocument()
    expect(screen.queryByText(/інформація видалена/)).toBeNull()
  })

  it('gives the short deleted label on BOTH surfaces — headline and detailed row (Р2/Г3)', () => {
    render(
      <ActivityStrip
        items={[
          job('ready', {
            display_deleted: true,
            display_deleted_at: ago(MIN),
            display_name: SCRUB,
          }),
        ]}
      />,
    )
    // Collapsed headline only, before opening.
    expect(screen.getAllByText('Матеріал видалено')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Now the detailed row (ActivityStripRow) renders the same short label too.
    expect(screen.getAllByText('Матеріал видалено')).toHaveLength(2)
    expect(screen.queryByText(/інформація видалена/)).toBeNull()
  })

  it('a live material shows its name, never the deleted label', () => {
    render(<ActivityStrip items={[job('processing', { display_name: 'live.mp4' })]} />)
    expect(screen.getByText('live.mp4')).toBeInTheDocument()
    expect(screen.queryByText('Матеріал видалено')).toBeNull()
  })

  it('collapses to a named icon below the breakpoint, opening the same panel (Г8)', () => {
    render(<ActivityStrip items={[job('processing', { display_name: 'a.mp4' })]} />)
    // One trigger, named for screen readers like the collapsed nav items.
    const btn = screen.getByRole('button', { name: 'Останні роботи' })
    // Below `lg` it is an icon; the full headline is gated to `lg`+. jsdom applies
    // no CSS, so we assert the breakpoint classes, not computed visibility.
    expect(btn.querySelector('.lg\\:hidden')).toBeTruthy() // the icon
    expect(btn.querySelector('.hidden.lg\\:flex')).toBeTruthy() // the full floor
    // The collapsed trigger opens the same detailed panel.
    fireEvent.click(btn)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
