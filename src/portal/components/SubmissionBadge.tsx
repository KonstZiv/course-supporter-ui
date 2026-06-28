import type { PortalSubmissionOverlay } from '../types'

// Read-only submission overlay badge for a task node (Phase 6 / T4b, c2,
// corrective 6). Shows submission_status and — when reviewed — the best
// attempt's score + passed flag. Terminal errors are NOT distinguished: the
// backend folds rejected / mismatch / failed into "pending" (DD-6-D borrow),
// and surfacing them with human-readable UX is DD-6-D / c3, not c2.
export function SubmissionBadge({ overlay }: { overlay: PortalSubmissionOverlay }) {
  const base = 'text-xs px-2 py-0.5 rounded-full whitespace-nowrap'

  if (overlay.submission_status === 'none') {
    return <span className={`${base} bg-canvas-dark text-ink-muted`}>Не здано</span>
  }
  if (overlay.submission_status === 'pending') {
    return <span className={`${base} bg-amber-pale text-amber-dark`}>На перевірці</span>
  }

  // reviewed — show the best usable score + verdict, if any.
  const best = overlay.best
  if (best && best.score !== null) {
    const passed = best.verdict?.passed ?? false
    const tone = passed ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
    return (
      <span className={`${base} ${tone}`}>
        {best.score}/100 · {passed ? 'зараховано' : 'не зараховано'}
      </span>
    )
  }
  return <span className={`${base} bg-forest-pale text-forest`}>Перевірено</span>
}
