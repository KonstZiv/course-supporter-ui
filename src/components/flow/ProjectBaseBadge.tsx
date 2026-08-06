import { clsx } from 'clsx'
import type { ProjectBaseState } from '../../types/api'

// Own domain badge for the project base's normalization lifecycle — NOT a reuse
// of StatusBadge (which is bound to ProcessingPhase). The states are distinct:
// pending ≠ ready ≠ failed, each a separate render; failed carries a reason
// shown next to the badge by the caller.
const config: Record<ProjectBaseState, { label: string; cls: string }> = {
  pending: {
    label: 'Нормалізація…',
    cls: 'bg-amber-pale text-amber-dark animate-pulse-soft',
  },
  ready: { label: 'Готово', cls: 'bg-forest-pale text-forest' },
  failed: { label: 'Помилка', cls: 'bg-coral-pale text-coral' },
}

export function ProjectBaseBadge({ state }: { state: ProjectBaseState }) {
  const c = config[state]
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        c.cls,
      )}
    >
      {c.label}
    </span>
  )
}
