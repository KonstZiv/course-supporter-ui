import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'

// Presentation slides carousel (Phase 6 / T4b, c2, ratify Q1). Prev/next +
// "K / N" counter over the ordered presigned-GET WebP renders. The caller
// guards the empty (pre-T3) case with a placeholder, so ``slides`` is non-empty.
export function SlidesCarousel({ slides }: { slides: string[] }) {
  const [index, setIndex] = useState(0)
  const t = useT()
  const current = slides[index]
  if (current === undefined) return null

  return (
    <div>
      <img
        src={current}
        alt={t('portal.slides.alt', { n: String(index + 1) })}
        className="w-full rounded-lg border border-canvas-dark/40 bg-canvas"
      />
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="btn-secondary btn-sm disabled:opacity-40"
        >
          <ChevronLeft size={16} />
          {t('portal.slides.previous')}
        </button>
        <span className="text-sm text-ink-muted">
          {index + 1} / {slides.length}
        </span>
        <button
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
          className="btn-secondary btn-sm disabled:opacity-40"
        >
          {t('portal.slides.next')}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
