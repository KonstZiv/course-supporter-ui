import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RunStatePanel } from './RunStatePanel'
import type {
  JobListItemResponse,
  JobState,
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

// The card now reads a work-list ROW (Д1/В2 fold); job_state replaces the raw
// status, and stage_progress is the untyped run-state JSONB.
function makeJob(
  job_state: JobState,
  stage_progress: NodeSummaryRunState | null,
  overrides: Partial<JobListItemResponse> = {},
): JobListItemResponse {
  return {
    id: 'job-1',
    job_type: 'node_summary_regeneration',
    job_state,
    queued_at: '2026-06-13T00:00:00Z',
    started_at: null,
    completed_at: null,
    subject_type: 'course_node',
    subject_id: null,
    material_id: null,
    display_name: null,
    display_deleted: false,
    display_deleted_at: null,
    material_source_type: null,
    base_version: null,
    current_stage: null,
    stage_progress: stage_progress as unknown as Record<string, unknown> | null,
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
      <RunStatePanel job={makeJob('error', rs)} nodeTitle="Розділ 3" onDismiss={vi.fn()} />,
    )

    expect(screen.getByText('Parent Raw missing within scope')).toBeInTheDocument()
    expect(screen.getByText('Parent out of run scope')).toBeInTheDocument()

    const prefix = screen.getByText('Очікувано:')
    expect(prefix).toBeInTheDocument()
    expect(prefix.textContent).not.toContain('Parent out of run scope')

    expect(container.querySelectorAll('[data-severity="ERROR"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-severity="WARNING"]')).toHaveLength(1)
  })

  it('treats severity as the only style driver — error_class is ignored', () => {
    const rs = makeRunState({
      errors: [
        makeError('ERROR', { reason: 'A', error_class: 'parent_summary_missing_within_scope' }),
        makeError('ERROR', { reason: 'B', error_class: 'parent_node_missing_from_database' }),
      ],
    })
    const { container } = render(
      <RunStatePanel job={makeJob('error', rs)} nodeTitle="X" onDismiss={vi.fn()} />,
    )

    const errs = container.querySelectorAll('[data-severity="ERROR"]')
    expect(errs).toHaveLength(2)
    expect(errs[0]!.className).toBe(errs[1]!.className)
    expect(screen.queryByText(/parent_summary_missing_within_scope/)).toBeNull()
    expect(screen.queryByText(/parent_node_missing_from_database/)).toBeNull()
  })

  it('reads errors[] independently of state (errors show when ready)', () => {
    const rs = makeRunState({
      errors: [makeError('ERROR', { reason: 'shown even when ready' })],
    })
    const { container } = render(
      <RunStatePanel job={makeJob('ready', rs)} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    expect(screen.getByText('shown even when ready')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-severity="ERROR"]')).toHaveLength(1)
  })

  it('shows the work-state word', () => {
    render(
      <RunStatePanel job={makeJob('processing', makeRunState())} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    expect(screen.getByText('Обробляється')).toBeInTheDocument()
  })

  it('speaks the work state as a word per the §3 formula — never a filled chip (В4)', () => {
    const { rerender } = render(
      <RunStatePanel job={makeJob('processing', makeRunState())} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    const live = screen.getByText('Обробляється')
    expect(live.className).toContain('animate-pulse-soft')
    expect(live.className).not.toContain('bg-')

    rerender(
      <RunStatePanel job={makeJob('error', makeRunState())} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    const err = screen.getByText('Помилка')
    expect(err.className).toContain('text-coral')
    expect(err.className).not.toContain('bg-')

    rerender(
      <RunStatePanel job={makeJob('ready', makeRunState())} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    const done = screen.getByText('Готово')
    expect(done.className).toContain('text-ink-muted')
    expect(done.className).not.toContain('bg-')
    expect(done.className).not.toContain('animate-pulse-soft')
  })

  it('shows a manual dismiss on a terminal row and calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(
      <RunStatePanel job={makeJob('ready', makeRunState())} nodeTitle="X" onDismiss={onDismiss} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /закрити/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders obsolete as a benign terminal (label + dismissible)', () => {
    const onDismiss = vi.fn()
    render(
      <RunStatePanel job={makeJob('obsolete', makeRunState())} nodeTitle="X" onDismiss={onDismiss} />,
    )
    expect(screen.getByText('Застаріло')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /закрити/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('hides dismiss while the run is in flight (processing)', () => {
    render(
      <RunStatePanel job={makeJob('processing', makeRunState())} nodeTitle="X" onDismiss={vi.fn()} />,
    )
    expect(screen.queryByRole('button', { name: /закрити/i })).toBeNull()
  })

  it('shows the derived node meter during a pass, not the internal pass word (Д3/Д5)', () => {
    const rs = makeRunState({
      pass1: { a: 'done', b: 'done' },
      pass2: { a: 'pending', c: 'pending' },
    })
    render(
      <RunStatePanel
        job={makeJob('processing', rs, { current_stage: 'bottomup' })}
        nodeTitle="X"
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('вузол 2 з 4')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    // The internal "прохід"/pass word is never shown (Д5).
    expect(screen.queryByText(/прохід|знизу-вгору|згори-вниз/i)).toBeNull()
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
