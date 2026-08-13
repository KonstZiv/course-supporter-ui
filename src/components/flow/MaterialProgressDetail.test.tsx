import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaterialProgressDetail } from './MaterialProgressDetail'
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
    started_at: '2026-08-01T00:40:00Z',
    completed_at: null,
    subject_type: null,
    subject_id: null,
    material_id: 'm',
    display_name: null,
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: 'video',
    base_version: null,
    current_stage: null,
    stage_progress: null,
    ...overrides,
  }
}

describe('MaterialProgressDetail (Д1)', () => {
  it('no live job → renders nothing', () => {
    const { container } = render(<MaterialProgressDetail job={undefined} now={NOW} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('video in detection → the meter', () => {
    render(
      <MaterialProgressDetail
        now={NOW}
        job={job({
          job_type: 'document_processing',
          job_state: 'processing',
          current_stage: 'detecting',
          stage_progress: { stage: 'detecting', current: 240, total: 1800, unit: 'frames' },
        })}
      />,
    )
    expect(screen.getByText('кадр 240 з 1800')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('processing without a bar → the duration', () => {
    render(
      <MaterialProgressDetail
        now={NOW}
        job={job({
          job_type: 'document_processing',
          job_state: 'processing',
          current_stage: 'extracting_structure',
        })}
      />,
    )
    expect(screen.getByText('3 год 20 хв')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
