import { AlertTriangle, X, MapPin } from 'lucide-react'

export interface StaleNodeRef {
  id: string
  // Resolved human title (CoursePage falls back to a truncated id when the
  // node cannot be found in the tree).
  title: string
}

interface Props {
  // Stale CourseNodes outside the vertex subtree, resolved to titles by the
  // page (RejectionNotice stays presentational — Ratified #2 / SummaryBadge
  // discipline).
  staleNodes: StaleNodeRef[]
  /** Human node title from the trigger; falls back to a dash. */
  nodeTitle: string | null
  /** Navigate to (select + highlight) a stale node on the canvas. */
  onNavigate: (nodeId: string) => void
  onRetryForce: () => void
  onDismiss: () => void
}

/**
 * 422 rejection notice for a generation trigger (Task 3.2.5a c4, enriched in
 * 3.2.5b c6). Occupies the same bottom-right slot as ``RunStatePanel``
 * (mutually exclusive — the 422 returns before any job exists).
 *
 * Enriched vertex-resolution UX (Ratified #6): the stale nodes are listed by
 * TITLE and each is clickable to navigate (select + highlight) the offending
 * node on the canvas, instead of bare truncated ids. The "retry with force"
 * action is preserved (generate anyway, leaving the stale nodes behind). A
 * higher-vertex re-generate is deferred (DD — see POST-MR-NOTES). Amber, not
 * coral: this is an expected gate, not a failure.
 */
export function RejectionNotice({
  staleNodes,
  nodeTitle,
  onNavigate,
  onRetryForce,
  onDismiss,
}: Props) {
  const runLabel = nodeTitle?.trim() || '—'
  const count = staleNodes.length

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
            Поза піддеревом є застарілі вузли ({count}). Перейдіть до них, щоб
            переглянути, або згенеруйте все одно з примусовим прогоном.
          </span>
        </div>

        {count > 0 && (
          <ul className="space-y-0.5 max-h-32 overflow-y-auto">
            {staleNodes.map((node) => (
              <li key={node.id}>
                <button
                  className="w-full flex items-center gap-1.5 text-left text-xs text-navy
                             px-2 py-1 rounded-lg hover:bg-navy-pale transition-colors"
                  onClick={() => onNavigate(node.id)}
                  title="Перейти до вузла"
                >
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{node.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button className="btn-primary btn-sm w-full" onClick={onRetryForce}>
          Згенерувати з force
        </button>
      </div>
    </div>
  )
}
