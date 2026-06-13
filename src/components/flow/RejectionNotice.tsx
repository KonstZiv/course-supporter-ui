import { AlertTriangle, X } from 'lucide-react'
import type { UncoveredStaleNodesDetail } from '../../types/api'

interface Props {
  detail: UncoveredStaleNodesDetail
  /** Human node title from the trigger; falls back to a dash. */
  nodeTitle: string | null
  onRetryForce: () => void
  onDismiss: () => void
}

/**
 * 422 rejection notice for a generation trigger (Task 3.2.5a c4). Occupies
 * the same bottom-right slot as ``RunStatePanel`` (mutually exclusive — the
 * 422 returns before any job exists, so it cannot live in a job-keyed card).
 *
 * Simplified per ratify #2: shows the human reason + the uncovered stale
 * node ids + a "retry with force" action. No vertex navigation / canvas
 * highlight — that richer resolution UX is 3.2.5b. Amber, not coral: this is
 * an expected gate, not a failure.
 */
export function RejectionNotice({
  detail,
  nodeTitle,
  onRetryForce,
  onDismiss,
}: Props) {
  const runLabel = nodeTitle?.trim() || '—'
  const ids = detail.uncovered_stale_node_ids
  const count = ids.length

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[360px] bg-white rounded-xl
                 shadow-card-lg border border-canvas-dark/40 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-canvas-dark/30 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-muted mb-1.5">
            Згенерувати опис · «{runLabel}»
          </p>
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full
                       text-xs font-medium bg-amber-pale text-amber-dark"
          >
            Відхилено
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Закрити"
          title="Закрити"
          className="p-1.5 rounded-lg hover:bg-canvas-dark transition-colors shrink-0"
        >
          <X size={15} className="text-ink-muted" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2 items-start text-xs text-ink">
          <AlertTriangle size={13} className="text-amber shrink-0 mt-0.5" />
          <span>
            Поза піддеревом є застарілі вузли ({count}). Згенерувати все одно
            з примусовим прогоном?
          </span>
        </div>

        {count > 0 && (
          <ul className="text-[10px] text-ink-muted font-mono space-y-0.5 max-h-20 overflow-y-auto">
            {ids.map((id) => (
              <li key={id}>{id.slice(0, 8)}</li>
            ))}
          </ul>
        )}

        <button className="btn-primary btn-sm w-full" onClick={onRetryForce}>
          Повторити з force
        </button>
      </div>
    </div>
  )
}
