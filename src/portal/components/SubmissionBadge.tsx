import type { PortalSubmissionOverlay } from '../types'

// The student's best usable result, as one phrase, or null when no attempt has
// earned one yet. ``best`` is the backend's own pick (highest-scored REVIEWED
// attempt with a non-null score — pending and null-score attempts never
// compete), so this only formats it.
function bestResult(overlay: PortalSubmissionOverlay): string | null {
  const best = overlay.best
  if (!best || best.score === null) return null
  return `${best.score}/100 · ${best.verdict?.passed ? 'зараховано' : 'не зараховано'}`
}

// Read-only submission overlay badge for a task node (Phase 6 / T4b; c2 +
// c3b "error"). Two tiers, and they answer different questions (step Г2 §2.3):
// the STATE comes from the latest attempt, the NUMBER from the best one.
//
// Before this the state tier swallowed the number tier: a student whose latest
// attempt failed, or was still in flight, saw "Помилка" / "На перевірці" and
// their 77/100 vanished from the tree — the badge lost the standing result
// exactly when a new attempt put it at risk. The two are now shown together,
// in the tone of the state, because "what is happening now" and "what I have
// earned so far" are both true and neither replaces the other.
export function SubmissionBadge({ overlay }: { overlay: PortalSubmissionOverlay }) {
  const base = 'text-xs px-2 py-0.5 rounded-full whitespace-nowrap'
  const result = bestResult(overlay)

  if (overlay.submission_status === 'none') {
    return <span className={`${base} bg-canvas-dark text-ink-muted`}>Не здано</span>
  }
  if (overlay.submission_status === 'pending') {
    return (
      <span className={`${base} bg-amber-pale text-amber-dark`}>
        {result ? `На перевірці · ${result}` : 'На перевірці'}
      </span>
    )
  }
  if (overlay.submission_status === 'error') {
    // A terminal error (rejected / mismatch / failed): the LATEST attempt never
    // reached a graded result. The tone stays the error's, and the number that
    // rides along is an EARLIER attempt's — which is why it is never shown
    // alone here. DISTINCT from the reviewed branch below, where the same
    // "{score}/100 · не зараховано" means checked-and-not-passed rather than
    // a processing failure.
    return (
      <span className={`${base} bg-coral-pale text-coral`}>
        {result ? `Помилка · ${result}` : 'Помилка'}
      </span>
    )
  }

  // reviewed — the best usable score + verdict, in its own tone.
  if (result) {
    const passed = overlay.best?.verdict?.passed ?? false
    const tone = passed ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
    return <span className={`${base} ${tone}`}>{result}</span>
  }
  return <span className={`${base} bg-forest-pale text-forest`}>Перевірено</span>
}
