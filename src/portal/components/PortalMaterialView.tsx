import { ExternalLink } from 'lucide-react'
import type { PortalMaterialItem, PortalMediaResponse } from '../types'

// Renders a loaded media descriptor (Phase 6 / T4b, c2). The rich per-(kind ×
// source_type) inline rendering lands in c2.3; this c2.2 version is the minimal
// TOTAL fallback (corrective 1): every branch yields something, and file /
// external always expose the guaranteed "Відкрити / Завантажити" affordance
// (corrective 2). ``item.source_type`` is taken from the tree item because the
// media descriptor itself is source_type-blind (probe B) — it only carries
// ``kind`` + ``url`` / ``slide_urls``.
export function PortalMaterialView({
  media,
  item,
}: {
  media: PortalMediaResponse
  item: PortalMaterialItem
}) {
  if (media.kind === 'slides') {
    const slides = media.slide_urls ?? []
    if (slides.length === 0) {
      return (
        <p className="text-ink-muted py-8 text-center">Слайди ще готуються.</p>
      )
    }
    return (
      <div className="space-y-3">
        {slides.map((url, i) => (
          <img
            key={url}
            src={url}
            alt={`Слайд ${i + 1}`}
            className="w-full rounded-lg border border-canvas-dark/40"
          />
        ))}
      </div>
    )
  }

  if (media.url) {
    return (
      <div className="py-6">
        <a
          href={media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Відкрити / Завантажити
          <ExternalLink size={16} />
        </a>
        <p className="mt-2 text-xs text-ink-muted">{item.source_type}</p>
      </div>
    )
  }

  return (
    <p className="text-ink-muted py-8 text-center">Неможливо відобразити цей матеріал.</p>
  )
}
