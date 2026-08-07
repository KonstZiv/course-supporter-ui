import { clsx } from 'clsx'
import type { ProcessingPhase } from '../../types/api'
import { phaseVocab, phaseBadgeClass } from '../../utils/stateVocabulary'

// The material state badge speaks the canonical phase axis (TASK-B §2): five
// values, five words, from the shared vocabulary. The coarse ``state`` axis is
// no longer read for display — an unknown future phase degrades to a muted chip
// (phaseVocab), never a raw token, never a crash.
export function StatusBadge({ phase }: { phase: ProcessingPhase }) {
  const v = phaseVocab(phase)
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        phaseBadgeClass(v),
      )}
    >
      {v.label}
    </span>
  )
}
