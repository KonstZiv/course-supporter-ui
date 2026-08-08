import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown, Trash2 } from 'lucide-react'
import type { JobListItemResponse } from '../../types/api'
import { JOB_STATE_LABEL, jobStateWordClass } from '../../utils/stateVocabulary'
import { deletedMaterialLabelShort } from '../../utils/materialLabel'
import { deriveFloors } from '../../utils/activityFloors'
import { ActivityStripPanel } from './ActivityStripPanel'

// Collapsed floor (§2 / В4): pinned in the header. Shows the window compressed to
// one headline — the newest live job, else the newest finished in the window — as
// a state word + subject label, with "і ще N" for the rest of that same list.
// Clicking opens the detailed floor. Colour belongs to the material phase, not
// here (§3): the work word carries motion/mute/alarm-text, never a filled chip.
export function ActivityStrip({ items }: { items: JobListItemResponse[] }) {
  const [open, setOpen] = useState(false)
  const now = Date.now()
  const { headline, moreCount, detailed } = deriveFloors(items)

  // Empty state (§2): nothing live and nothing finished within the window → no
  // strip in the header, not an empty shell.
  if (!headline) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Показати останні роботи"
        className="flex items-center gap-2 max-w-full px-3 py-1.5 rounded-xl
                   hover:bg-canvas-dark/60 transition-colors text-sm"
      >
        <span
          className={clsx(
            'shrink-0 font-medium',
            jobStateWordClass(headline.job_state),
          )}
        >
          {JOB_STATE_LABEL[headline.job_state]}
        </span>
        <span className="min-w-0 flex items-center gap-1 text-ink-light">
          {headline.display_deleted ? (
            <>
              <Trash2 size={12} className="shrink-0 text-ink-muted" />
              <span className="truncate text-ink-muted">
                {deletedMaterialLabelShort()}
              </span>
            </>
          ) : (
            headline.display_name && (
              <span className="truncate">{headline.display_name}</span>
            )
          )}
        </span>
        {moreCount > 0 && (
          <span className="shrink-0 text-xs text-ink-muted">і ще {moreCount}</span>
        )}
        <ChevronDown
          size={14}
          className={clsx(
            'shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ActivityStripPanel
          rows={detailed}
          now={now}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
