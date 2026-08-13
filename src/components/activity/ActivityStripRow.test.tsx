import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityStripRow } from './ActivityStripRow'
import type { JobListItemResponse, JobState, AuthorJobType } from '../../types/api'

const NOW = Date.parse('2026-08-01T04:00:00Z')

function job(
  overrides: Partial<JobListItemResponse> & {
    job_type: AuthorJobType
    job_state: JobState
  },
): JobListItemResponse {
  return {
    id: 'j',
    queued_at: '2026-08-01T00:00:00Z',
    started_at: null,
    completed_at: null,
    subject_type: null,
    subject_id: null,
    material_id: 'm',
    display_name: 'lecture.mp4',
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: 'video',
    base_version: null,
    current_stage: null,
    stage_progress: null,
    ...overrides,
  }
}

describe('ActivityStripRow — progress detail (Д2)', () => {
  it('video in detection → the meter, product language, no time', () => {
    render(
      <ActivityStripRow
        now={NOW}
        job={job({
          job_type: 'document_processing',
          job_state: 'processing',
          started_at: '2026-08-01T03:00:00Z',
          current_stage: 'detecting',
          stage_progress: { stage: 'detecting', current: 240, total: 1800, unit: 'frames' },
        })}
      />,
    )
    expect(screen.getByText('кадр 240 з 1800')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '240')
    // The internal unit token never leaves (Д5).
    expect(screen.queryByText(/frames?/i)).not.toBeInTheDocument()
  })

  it('processing without a bar → the elapsed duration from pickup (Д4)', () => {
    render(
      <ActivityStripRow
        now={NOW}
        job={job({
          job_type: 'document_processing',
          job_state: 'processing',
          started_at: '2026-08-01T00:40:00Z', // 3 год 20 хв before NOW
          current_stage: 'extracting_structure',
        })}
      />,
    )
    expect(screen.getByText('3 год 20 хв')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('processing with no start moment → words alone, no number (Д4 anomaly)', () => {
    render(
      <ActivityStripRow
        now={NOW}
        job={job({
          job_type: 'document_processing',
          job_state: 'processing',
          started_at: null,
          current_stage: 'extracting_structure',
        })}
      />,
    )
    expect(screen.getByText('Обробляється')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/тому|хв|год/)).not.toBeInTheDocument()
  })

  it('a terminal row → the relative time, no progress detail', () => {
    render(
      <ActivityStripRow
        now={NOW}
        job={job({
          job_type: 'document_processing',
          job_state: 'ready',
          completed_at: '2026-08-01T03:55:00Z', // 5 хв before NOW
          current_stage: 'creating_segments',
          stage_progress: { stage: 'detecting', current: 1800, total: 1800, unit: 'frames' },
        })}
      />,
    )
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText(/тому/)).toBeInTheDocument()
  })
})
