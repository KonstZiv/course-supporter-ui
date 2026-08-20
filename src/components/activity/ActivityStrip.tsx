import { useState } from 'react'
import { clsx } from 'clsx'
import { Activity, ChevronDown, Trash2 } from 'lucide-react'
import type { JobListItemResponse } from '../../types/api'
import { JOB_STATE_LABEL, jobStateWordClass } from '../../utils/stateVocabulary'
import { deletedMaterialLabelShort } from '../../utils/materialLabel'
import { deriveFloors } from '../../utils/activityFloors'
import { ActivityStripPanel } from './ActivityStripPanel'

// Collapsed floor (§2 / В4): pinned in the header. At `xl`+ it shows the window
// compressed to one headline — the newest live job, else the newest finished in
// the window — as a state word + subject label, with "і ще N" for the rest; the
// subject truncates so the button shrinks with its container (Г8 п.1). BELOW `xl`
// it collapses to a single activity icon that opens the same detailed floor (Г8
// п.2) — the header stops competing for width. The strip flexes at `xl`, one step
// ABOVE the `lg` nav-label compaction (Header.tsx) — deliberately decoupled: the
// headline's non-shrinking parts (state word + "і ще N" + chevron) overflowed the
// centre zone onto the first nav item across the lg–xl band (measured: headline
// floor ~199px vs a ~101px centre zone at 1280, overlap tapering to zero by
// ~1378 for the worst case "Обробляється" + "і ще NN"). The residual [1280,~1378]
// worst-case overlap is tracked as debt; spatial-collapse-by-measurement is the
// fuller fix. Colour belongs to the material phase, not here (§3): the work word
// carries motion/mute/alarm-text, never a filled chip.
export function ActivityStrip({ items }: { items: JobListItemResponse[] }) {
  const [open, setOpen] = useState(false)
  const now = Date.now()
  const { headline, moreCount, detailed } = deriveFloors(items)

  // Empty state (§2): nothing live and nothing finished within the window → no
  // strip in the header, not an empty shell.
  if (!headline) return null

  return (
    // ``min-w-0 max-w-full`` closes the shrink-chain from the header's bounded
    // central zone (Header.tsx :60 `flex-1 min-w-0`) down to the truncating
    // subject. This relative wrapper is the flex item in that zone; its default
    // `min-width:auto` (no min-w-0) let a non-breaking name grow past the
    // viewport — the button's `max-w-full` resolved against an already-grown
    // parent, so `truncate` never received a bounded width to clip (Д1).
    <div className="relative min-w-0 max-w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Останні роботи"
        title="Показати останні роботи"
        className="flex items-center gap-2 min-w-0 max-w-full px-2 xl:px-3 py-1.5
                   rounded-xl hover:bg-canvas-dark/60 transition-colors text-sm"
      >
        {/* Below `xl` (Г8 п.2): just the icon — named by the button's aria-label,
            like the collapsed nav items. */}
        <Activity size={18} className="xl:hidden shrink-0 text-ink-light" />
        {/* At `xl`+: the full headline. ``min-w-0`` on the button and the name lets
            the subject truncate so the button never overflows its container. */}
        <span className="hidden xl:flex items-center gap-2 min-w-0">
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
                <span className="truncate min-w-0 text-ink-muted">
                  {deletedMaterialLabelShort()}
                </span>
              </>
            ) : (
              headline.display_name && (
                <span className="truncate min-w-0">{headline.display_name}</span>
              )
            )}
          </span>
          {moreCount > 0 && (
            <span className="shrink-0 text-xs text-ink-muted">
              і ще {moreCount}
            </span>
          )}
          <ChevronDown
            size={14}
            className={clsx(
              'shrink-0 text-ink-muted transition-transform',
              open && 'rotate-180',
            )}
          />
        </span>
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
