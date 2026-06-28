import { ExternalLink } from 'lucide-react'
import type { PortalMaterialItem, PortalMediaResponse } from '../types'
import { SlidesCarousel } from './SlidesCarousel'
import { youtubeEmbedUrl } from './youtube'

// Renders a loaded media descriptor originals-only (Phase 6 / T4b, c2).
//
// The render is a TOTAL function of (kind × source_type) (corrective 1): every
// branch yields something, and a guaranteed "Відкрити / Завантажити" affordance
// backs the inline render so a failed <video>/<iframe>/<img> is never an empty
// panel (corrective 2). ``item.source_type`` comes from the tree item because
// the media descriptor is source_type-blind (probe B) — it carries only
// ``kind`` + ``url`` / ``slide_urls``.

function OpenLink({ url, primary }: { url: string; primary?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${primary ? 'btn-primary' : 'btn-secondary btn-sm'} mt-3 inline-flex`}
    >
      Відкрити / Завантажити
      <ExternalLink size={primary ? 16 : 14} />
    </a>
  )
}

function Unrenderable() {
  return (
    <p className="text-ink-muted py-8 text-center">
      Неможливо відобразити цей матеріал.
    </p>
  )
}

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
    return <SlidesCarousel slides={slides} />
  }

  if (media.kind === 'external') {
    if (!media.url) return <Unrenderable />
    // Only YouTube is embedded; an arbitrary web origin is linked out, not
    // iframed (corrective 4 / ratify Q1).
    const embed =
      item.source_type === 'video' ? youtubeEmbedUrl(media.url) : null
    if (embed) {
      return (
        <div>
          <div className="aspect-video">
            <iframe
              src={embed}
              title={item.label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg border border-canvas-dark/40"
            />
          </div>
          <OpenLink url={media.url} />
        </div>
      )
    }
    return (
      <div className="py-4">
        <OpenLink url={media.url} primary />
      </div>
    )
  }

  if (media.kind === 'file') {
    if (!media.url) return <Unrenderable />
    const url = media.url
    if (item.source_type === 'video') {
      return (
        <div>
          <video
            controls
            src={url}
            className="w-full rounded-lg border border-canvas-dark/40 bg-ink"
          />
          <OpenLink url={url} />
        </div>
      )
    }
    if (item.source_type === 'audio') {
      return (
        <div>
          <audio controls src={url} className="w-full" />
          <OpenLink url={url} />
        </div>
      )
    }
    // text / document / any other → best-effort inline, guaranteed affordance.
    return (
      <div>
        <iframe
          src={url}
          title={item.label}
          className="w-full h-[60vh] rounded-lg border border-canvas-dark/40 bg-white"
        />
        <OpenLink url={url} />
      </div>
    )
  }

  // Unknown kind — total default (corrective 1).
  return media.url ? (
    <div className="py-4">
      <OpenLink url={media.url} primary />
    </div>
  ) : (
    <Unrenderable />
  )
}
