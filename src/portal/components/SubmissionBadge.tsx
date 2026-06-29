import type { PortalSubmissionOverlay } from '../types'

// Read-only submission overlay badge for a task node (Phase 6 / T4b; c2 +
// c3b "error"). Shows submission_status and — when reviewed — the best
// attempt's score + passed flag. The backend de-collapse (DD-6-D) now surfaces
// a distinct "error" bucket for the terminal errors (rejected / mismatch /
// failed); the precise reason is in the attempts detail (terminalStatus).
export function SubmissionBadge({ overlay }: { overlay: PortalSubmissionOverlay }) {
  const base = 'text-xs px-2 py-0.5 rounded-full whitespace-nowrap'

  if (overlay.submission_status === 'none') {
    return <span className={`${base} bg-canvas-dark text-ink-muted`}>Не здано</span>
  }
  if (overlay.submission_status === 'pending') {
    return <span className={`${base} bg-amber-pale text-amber-dark`}>На перевірці</span>
  }
  if (overlay.submission_status === 'error') {
    // A terminal error (rejected / mismatch / failed): the latest attempt never
    // reached a graded result. DISTINCT from the reviewed verdict.passed ===
    // false branch below ("{score}/100 · не зараховано" — checked, not passed):
    // that is a grade, this is a processing/gate failure with no score. Drives
    // by the LATEST attempt even when an earlier one was reviewed (best may
    // exist, but the latest failed).
    return <span className={`${base} bg-coral-pale text-coral`}>Помилка</span>
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
