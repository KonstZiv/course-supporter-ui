import { progressCaption, type WorkProgressBar } from '../../utils/workProgress'

// The shared movement primitive: processing detail (Д2/Д5) AND, since step Е,
// the upload bar (Е6). A product-language caption — "кадр 240 з 1800" /
// "вузол 12 з 37" for processing, "45 МБ з 320 МБ" for upload; the internal
// unit token never shows — over a thin amber fill, the "busy" tone. The caller
// draws it only while the movement is live (Д2 for processing; Е5 for upload —
// gone once the last byte is sent, replaced by words).
export function ProgressMeter({ current, total, unit }: WorkProgressBar) {
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)))
  return (
    <div className="mt-1">
      <div className="text-xs text-ink-muted mb-0.5">
        {progressCaption({ current, total, unit })}
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
