import { clsx } from 'clsx'
import type { SummaryStatus } from '../../types/api'

// Status chip — one per summary state. ``none`` is intentionally absent:
// a node without a summary carries NO badge (no visual noise on a large
// tree), so the component returns null for it (Task 3.2.5b c2).
const statusConfig: Record<
  Exclude<SummaryStatus, 'none'>,
  { label: string; cls: string }
> = {
  draft: { label: 'Чернетка', cls: 'bg-amber-pale text-amber-dark' },
  approved: { label: 'Затверджено', cls: 'bg-forest-pale text-forest' },
}

/**
 * Methodist summary badge for a tree node.
 *
 * Two ORTHOGONAL axes rendered independently (Ratified #8 / Інваріант #4):
 * - ``status`` — the summary lifecycle (draft / approved) as a coloured chip.
 * - ``materialsChanged`` — axis-1 staleness as a SEPARATE chip, never merged
 *   into the status. An ``approved`` node whose materials changed shows BOTH
 *   chips so "approved but stale" reads as two signals, not one masking the
 *   other. Label is "матеріали змінились", never "потребує перегенерації".
 *
 * Renders nothing when ``status === 'none'``.
 */
export function SummaryBadge({
  status,
  materialsChanged,
}: {
  status: SummaryStatus
  materialsChanged: boolean
}) {
  if (status === 'none') return null
  const c = statusConfig[status]
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={clsx(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
          c.cls,
        )}
      >
        {c.label}
      </span>
      {materialsChanged && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px]
                     font-medium bg-coral-pale text-coral"
          title="Матеріали вузла змінились після генерації опису"
        >
          матеріали змінились
        </span>
      )}
    </span>
  )
}
