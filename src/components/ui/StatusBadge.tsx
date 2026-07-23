import { clsx } from 'clsx'
import type { DocumentState, ProcessingPhase } from '../../types/api'

const config: Record<DocumentState, { label: string; cls: string }> = {
  raw:              { label: 'Очікує',      cls: 'bg-canvas-dark text-ink-muted' },
  pending:          { label: 'Обробка…',    cls: 'bg-amber-pale text-amber-dark animate-pulse-soft' },
  ready:            { label: 'Готово',       cls: 'bg-forest-pale text-forest' },
  integrity_broken: { label: 'Змінено',      cls: 'bg-coral-pale text-coral' },
  error:            { label: 'Помилка',      cls: 'bg-coral-pale text-coral' },
}

// №21: ``awaiting_author`` is a processing_phase, not a DocumentState — the
// document's ``state`` collapses to ``ready`` (no in-flight job), so the phase
// is the ONLY signal that the author must still confirm file roles. Navy (the
// action accent) reads as "needs your attention", distinct from green (done),
// red (error) and the amber pulse (busy).
const AWAITING_AUTHOR = { label: 'Очікує підтвердження', cls: 'bg-navy-pale text-navy' }

export function StatusBadge({
  state,
  processingPhase,
}: {
  state: DocumentState
  processingPhase?: ProcessingPhase
}) {
  // The phase overrides only for ``awaiting_author``; any other/absent phase
  // falls through to the state label — behaviour as before (tolerance).
  const c =
    processingPhase === 'awaiting_author'
      ? AWAITING_AUTHOR
      : (config[state] ?? config.raw)
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
