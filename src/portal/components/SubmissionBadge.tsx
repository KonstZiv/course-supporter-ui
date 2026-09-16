import type { PortalSubmissionOverlay } from '../types'
import { isReviewed, stateLabel, stateTone } from '../presentationPhrases'

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
  const state = overlay.presentation?.state
  if (state !== undefined && !isReviewed(state)) {
    // The latest attempt has not reached a graded result. WHICH of the four
    // ways it did not is the server's answer now (mentor-rebuild task 03); the
    // tree used to collapse them into "Помилка", so a student whose work simply
    // did not look like an attempt was told the system had broken.
    //
    // The number that rides along is an EARLIER attempt's, which is why it is
    // never shown alone here. DISTINCT from the reviewed branch below, where
    // "{score}/100 · не зараховано" means checked-and-not-passed.
    const label = stateLabel(state)
    return (
      <span className={`${base} ${stateTone(state)}`}>
        {result ? `${label} · ${result}` : label}
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
