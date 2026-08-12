import { progressUnitWord, type WorkProgressBar } from '../../utils/workProgress'

// A NEW progress primitive for processing detail (Д2/Д5) — deliberately NOT the
// upload bar (that is step Е, left untouched). A product-language caption
// ("кадр 240 з 1800" / "вузол 12 з 37" — the internal unit token never shows)
// over a thin amber fill, the "busy" tone that the processing phase already
// uses. Rendered only when the caller has a live, current-stage bar (Д2).
export function ProgressMeter({ current, total, unit }: WorkProgressBar) {
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)))
  return (
    <div className="mt-1">
      <div className="text-xs text-ink-muted mb-0.5">
        {progressUnitWord(unit)} {current} з {total}
      </div>
      <div
        className="h-1 rounded-full bg-canvas-dark overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full bg-amber transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
