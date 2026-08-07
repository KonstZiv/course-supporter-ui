import type { JobListItemResponse } from '../../types/api'
import { ActivityStripRow } from './ActivityStripRow'

// Detailed floor (§2): a panel opening from the collapsed floor, over the page.
// Shows the loaded live + last-three-days rows; it scrolls inside itself — no
// "show more", no second read (В2). Anchored under the header strip, so it never
// touches the bottom-right floating card or the canvas controls (В3).
export function ActivityStripPanel({
  rows,
  now,
  onClose,
}: {
  rows: JobListItemResponse[]
  now: number
  onClose: () => void
}) {
  return (
    <>
      {/* Transparent click-away backdrop below the panel; above page content but
          below the header/floating cards (z-40), so those stay interactive. */}
      <div className="fixed inset-0 z-30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Останні роботи"
        className="absolute left-1/2 -translate-x-1/2 mt-2 w-[380px] max-w-[90vw]
                   max-h-[70vh] overflow-y-auto z-40 bg-white rounded-xl
                   shadow-card-lg border border-canvas-dark/40 p-2"
      >
        {rows.length === 0 ? (
          <p className="text-xs text-ink-muted px-2 py-3 text-center">
            Немає активних чи недавніх робіт
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((job) => (
              <li
                key={job.id}
                className="px-2 py-1.5 rounded-lg hover:bg-canvas-dark/40"
              >
                <ActivityStripRow job={job} now={now} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
