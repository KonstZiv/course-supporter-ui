import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RunStatePanel } from './RunStatePanel'
import type {
  JobResponse,
  JobStatus,
  NodeSummaryRunError,
  NodeSummaryRunState,
  RunErrorSeverity,
} from '../../types/api'

function makeRunState(
  overrides: Partial<NodeSummaryRunState> = {},
): NodeSummaryRunState {
  return {
    vertex_node_id: 'abcd1234ef567890',
    force: false,
    scope: { in_scope_node_ids: [], uncovered_stale_node_ids: [] },
    pass1: {},
    pass2: {},
    errors: [],
    started_at: '2026-06-13T00:00:00Z',
    updated_at: '2026-06-13T00:00:00Z',
    ...overrides,
  }
}

function makeJob(
  status: JobStatus,
  stage_progress: NodeSummaryRunState | null,
  overrides: Partial<JobResponse> = {},
): JobResponse {
  return {
    id: 'job-1',
    job_type: 'node_summary_regeneration',
    priority: 'normal',
    status,
    tenant_id: null,
    course_node_id: null,
    arq_job_id: null,
    current_stage: null,
    stage_progress,
    result_data: null,
    error_message: null,
    queued_at: '2026-06-13T00:00:00Z',
    started_at: null,
    completed_at: null,
    ...overrides,
  }
}

function makeError(
  severity: RunErrorSeverity,
  overrides: Partial<NodeSummaryRunError> = {},
): NodeSummaryRunError {
  return {
    node_id: 'node-x',
    stage: 'topdown',
    reason: 'default reason',
    at: '2026-06-13T00:00:00Z',
    severity,
    error_class: null,
    ...overrides,
  }
}

describe('RunStatePanel', () => {
  it('renders ERROR as an alert and WARNING muted; reason verbatim', () => {
    const rs = makeRunState({
      errors: [
        makeError('ERROR', { reason: 'Parent Raw missing within scope' }),
        makeError('WARNING', { reason: 'Parent out of run scope' }),
      ],
    })
    const { container } = render(
      <RunStatePanel
        job={makeJob('failed', rs)}
        nodeTitle="Розділ 3"
        onDismiss={vi.fn()}
      />,
    )

    // reason rendered verbatim for both.
    expect(
      screen.getByText('Parent Raw missing within scope'),
    ).toBeInTheDocument()
    expect(screen.getByText('Parent out of run scope')).toBeInTheDocument()

    // WARNING carries the UI prefix as a SEPARATE element (not merged into
    // reason — keeps the invariant "reason shown, not modified").
    const prefix = screen.getByText('Очікувано:')
    expect(prefix).toBeInTheDocument()
    expect(prefix.textContent).not.toContain('Parent out of run scope')

    // Style is keyed on severity via data-severity.
    expect(container.querySelectorAll('[data-severity="ERROR"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-severity="WARNING"]')).toHaveLength(
      1,
    )
  })

  it('treats severity as the only style driver — error_class is ignored', () => {
    const rs = makeRunState({
      errors: [
        makeError('ERROR', {
          reason: 'A',
          error_class: 'parent_summary_missing_within_scope',
        }),
        makeError('ERROR', {
          reason: 'B',
          error_class: 'parent_node_missing_from_database',
        }),
      ],
    })
    const { container } = render(
      <RunStatePanel job={makeJob('failed', rs)} nodeTitle="X" onDismiss={vi.fn()} />,
    )

    const errs = container.querySelectorAll('[data-severity="ERROR"]')
    expect(errs).toHaveLength(2)
    // Identical visual treatment regardless of error_class value.
    expect(errs[0]!.className).toBe(errs[1]!.className)
    // error_class is never shown to the author.
    expect(
      screen.queryByText(/parent_summary_missing_within_scope/),
    ).toBeNull()
    expect(screen.queryByText(/parent_node_missing_from_database/)).toBeNull()
  })

  it('reads errors[] independently of status (errors show on complete)', () => {
    const rs = makeRunState({
      errors: [makeError('ERROR', { reason: 'shown even when complete' })],
    })
    const { container } = render(
      <RunStatePanel job={makeJob('complete', rs)} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    expect(screen.getByText('shown even when complete')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-severity="ERROR"]')).toHaveLength(1)
  })

  it('shows the status badge label', () => {
    render(
      <RunStatePanel
        job={makeJob('active', makeRunState())}
        nodeTitle="X"
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('Генерується…')).toBeInTheDocument()
  })

  it('shows a manual dismiss on terminal status and calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(
      <RunStatePanel
        job={makeJob('complete', makeRunState())}
        nodeTitle="X"
        onDismiss={onDismiss}
      />,
    )
    const close = screen.getByRole('button', { name: /закрити/i })
    fireEvent.click(close)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('hides dismiss while the run is in flight (active)', () => {
    render(
      <RunStatePanel
        job={makeJob('active', makeRunState())}
        nodeTitle="X"
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /закрити/i })).toBeNull()
  })

  it('renders the pass1/pass2 tally in natural bucket order', () => {
    const rs = makeRunState({
      pass1: { a: 'done', b: 'done' },
      pass2: { a: 'skipped_memo', c: 'not_applicable' },
    })
    render(
      <RunStatePanel job={makeJob('active', rs)} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    expect(
      screen.getByText(/2 готово · 1 пропущено · 1 не застосовно/),
    ).toBeInTheDocument()
  })

  it('falls back to a vertex-id slice when nodeTitle is empty', () => {
    render(
      <RunStatePanel
        job={makeJob('queued', makeRunState({ vertex_node_id: 'abcd1234ef567890' }))}
        nodeTitle={null}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/«abcd1234»/)).toBeInTheDocument()
  })
})
