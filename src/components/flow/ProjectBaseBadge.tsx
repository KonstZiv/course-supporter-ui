import { clsx } from 'clsx'
import type { ProjectBaseState } from '../../types/api'
import { useT } from '../../i18n/LanguageContext'
import type { MessageKey } from '../../i18n/translate'

// Own domain badge for the project base's normalization lifecycle — NOT a reuse
// of StatusBadge (which is bound to ProcessingPhase). The states are distinct:
// pending ≠ ready ≠ failed, each a separate render; failed carries a reason
// shown next to the badge by the caller.
const config: Record<ProjectBaseState, { labelKey: MessageKey; cls: string }> = {
  pending: {
    labelKey: 'panel.flow.projectBaseBadge.pending',
    cls: 'bg-amber-pale text-amber-dark animate-pulse-soft',
  },
  ready: { labelKey: 'panel.flow.projectBaseBadge.ready', cls: 'bg-forest-pale text-forest' },
  failed: { labelKey: 'panel.flow.projectBaseBadge.failed', cls: 'bg-coral-pale text-coral' },
}

export function ProjectBaseBadge({ state }: { state: ProjectBaseState }) {
  const t = useT()
  const c = config[state]
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        c.cls,
      )}
    >
      {t(c.labelKey)}
    </span>
  )
}
