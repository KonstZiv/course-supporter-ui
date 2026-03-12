import { clsx } from 'clsx'
import type { MaterialState } from '../../types/api'

const config: Record<MaterialState, { label: string; cls: string }> = {
  raw:              { label: 'Очікує',      cls: 'bg-canvas-dark text-ink-muted' },
  pending:          { label: 'Обробка…',    cls: 'bg-amber-pale text-amber-dark animate-pulse-soft' },
  ready:            { label: 'Готово',       cls: 'bg-forest-pale text-forest' },
  integrity_broken: { label: 'Змінено',      cls: 'bg-coral-pale text-coral' },
  error:            { label: 'Помилка',      cls: 'bg-coral-pale text-coral' },
}

export function StatusBadge({ state }: { state: MaterialState }) {
  const c = config[state] ?? config.raw
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
