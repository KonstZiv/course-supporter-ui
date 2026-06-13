import { AlertTriangle, Info, Loader2, X } from 'lucide-react'
import type {
  JobResponse,
  JobStatus,
  NodeSummaryNodeStatus,
  NodeSummaryRunState,
} from '../../types/api'

// Job-level status badge — mirrors the map-driven ``StatusBadge`` pattern.
const STATUS_META: Record<JobStatus, { label: string; cls: string }> = {
  queued: { label: 'У черзі', cls: 'bg-canvas-dark text-ink-muted' },
  active: { label: 'Генерується…', cls: 'bg-amber-pale text-amber-dark animate-pulse-soft' },
  complete: { label: 'Готово', cls: 'bg-forest-pale text-forest' },
  failed: { label: 'Помилка', cls: 'bg-coral-pale text-coral' },
  cancelled: { label: 'Скасовано', cls: 'bg-canvas-dark text-ink-muted' },
}

// Pass labels for the optional progress tally (Task 3.2.5a §5).
const PASS_BUCKET_LABEL: Record<NodeSummaryNodeStatus, string> = {
  done: 'готово',
  skipped_memo: 'пропущено',
  not_applicable: 'не застосовно',
  pending: 'очікує',
  error: 'помилка',
}

const PASS_BUCKET_ORDER: NodeSummaryNodeStatus[] = [
  'done',
  'skipped_memo',
  'not_applicable',
  'pending',
  'error',
]

function stageLabel(stage: string | null): string | null {
  if (stage === 'bottomup') return 'знизу-вгору'
  if (stage === 'topdown') return 'згори-вниз'
  return null
}

/** Aggregate pass1+pass2 per-node status maps into a compact one-liner. */
function tallyPasses(state: NodeSummaryRunState | null): string | null {
  if (!state) return null
  const counts = new Map<NodeSummaryNodeStatus, number>()
  for (const s of [
    ...Object.values(state.pass1),
    ...Object.values(state.pass2),
  ]) {
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  if (counts.size === 0) return null
  const parts = PASS_BUCKET_ORDER.filter((k) => counts.get(k)).map(
    (k) => `${counts.get(k)} ${PASS_BUCKET_LABEL[k]}`,
  )
  return parts.length > 0 ? parts.join(' · ') : null
}

interface Props {
  job: JobResponse
  /** Human node title from the trigger; falls back to a vertex-id slice. */
  nodeTitle: string | null
  onDismiss: () => void
}

/**
 * Floating bottom-right run-state card for a node-summary generation job
 * (Task 3.2.5a, KD-A). Pure presentational — driven by the polled
 * ``JobResponse``; the trigger + 422 rejection live elsewhere (c4).
 *
 * severity rule (Інваріант 3 / DD-3.2.2-B): each ``errors[]`` entry is
 * styled EXCLUSIVELY by ``severity`` — ``ERROR`` is an alert, ``WARNING``
 * is muted. ``error_class`` is never interpreted or shown; ``reason`` is
 * rendered verbatim (the "Очікувано:" prefix is a UI frame, kept as a
 * separate element so it never reads as backend text).
 */
export function RunStatePanel({ job, nodeTitle, onDismiss }: Props) {
  const runState = job.stage_progress
  const meta = STATUS_META[job.status] ?? STATUS_META.queued
  const runLabel =
    nodeTitle?.trim() || runState?.vertex_node_id.slice(0, 8) || '—'

  // Manual dismiss only once the run is no longer in flight — never
  // auto-dismiss (errors[] must stay visible until the author acts).
  const isDone =
    job.status === 'complete' ||
    job.status === 'failed' ||
    job.status === 'cancelled'

  const stage = job.status === 'active' ? stageLabel(job.current_stage) : null
  const passTally = tallyPasses(runState)
  const errors = runState?.errors ?? []

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[360px] bg-white rounded-xl
                 shadow-card-lg border border-canvas-dark/40 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-canvas-dark/30 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted mb-1.5">
            Генерація опису · «{runLabel}»
          </p>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full
                        text-xs font-medium ${meta.cls}`}
          >
            {meta.label}
          </span>
        </div>
        {isDone && (
          <button
            onClick={onDismiss}
            aria-label="Закрити"
            title="Закрити"
            className="p-1.5 rounded-lg hover:bg-canvas-dark transition-colors shrink-0"
          >
            <X size={15} className="text-ink-muted" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        {stage && (
          <p className="text-xs text-ink-muted flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Прохід: {stage}
          </p>
        )}

        {passTally && (
          <p className="text-xs text-ink-muted">Вузли: {passTally}</p>
        )}

        {errors.length > 0 && (
          <ul className="space-y-1.5">
            {errors.map((e, i) => {
              const isError = e.severity === 'ERROR'
              return (
                <li
                  key={`${e.node_id}-${e.stage}-${i}`}
                  data-severity={e.severity}
                  className={
                    isError
                      ? 'flex gap-2 items-start text-xs rounded-lg px-2.5 py-2 border-l-2 border-coral bg-coral-pale text-ink'
                      : 'flex gap-2 items-start text-xs rounded-lg px-2.5 py-2 border-l-2 border-amber/40 bg-amber-pale/40 text-ink-muted'
                  }
                >
                  {isError ? (
                    <AlertTriangle size={13} className="text-coral shrink-0 mt-0.5" />
                  ) : (
                    <Info size={13} className="text-amber shrink-0 mt-0.5" />
                  )}
                  <span className="min-w-0 break-words">
                    {!isError && <span className="font-medium">Очікувано: </span>}
                    {e.reason}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
