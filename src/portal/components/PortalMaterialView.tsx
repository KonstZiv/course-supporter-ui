import { useEffect, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import type { PortalMaterialItem, PortalMediaResponse } from '../types'
import { MarkdownContent } from './MarkdownContent'
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
//
// Text-family file branches select by an extension allowlist over the signed
// key's path (``extOf``; ratify Р1/Р2, крок Б): pdf → built-in viewer, md/
// markdown → rendered Markdown, txt/html/htm → sandboxed iframe, anything else
// (docx and any future extension) → an honest no-preview notice.

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

// Format signal (ratify Р1): the extension in the signed key's path (the path
// precedes the query string) — the mechanism the pdf branch already used, now
// the single signal for every text-family branch. Exported for a unit test.
// For a name without a dot it returns the full lower-cased name (matches no
// allowlist extension → the no-preview branch); empty only for a trailing-slash
// path (post-ratified clarification 2026-08-24, step-b/TASK.md).
// eslint-disable-next-line react-refresh/only-export-components -- extOf експортовано лише для юніт-тестів (TASK кроку Б)
export const extOf = (url: string): string =>
  ((url.split('?')[0] ?? '').split('/').pop() ?? '').split('.').pop()?.toLowerCase() ?? ''

// A .md material rendered as formatted Markdown (student-path step Б, ratify Р6):
// the client fetches the signed URL's text (CORS opened by the portalMediaFetch
// B2 rule) and renders it through the shared MarkdownContent (GFM + mermaid). A
// guaranteed "Відкрити / Завантажити" affordance backs it (corrective 2).
function MarkdownMaterial({ url }: { url: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; text: string }
    | { status: 'error' }
  >({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
        return res.text()
      })
      .then((text) => setState({ status: 'ready', text }))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [url])

  if (state.status === 'loading') {
    return (
      <p className="text-ink-muted py-8 text-center">Завантаження конспекту…</p>
    )
  }
  if (state.status === 'error') {
    return (
      <>
        <p className="text-ink-muted py-8 text-center">
          Не вдалося завантажити конспект.
        </p>
        <OpenLink url={url} primary />
      </>
    )
  }
  return (
    <div>
      <MarkdownContent markdown={state.text} />
      <OpenLink url={url} />
    </div>
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
    if (item.source_type === 'code') {
      // R7 (task-code-materials): code is download-only — single file and
      // project archive alike. The URL is presigned with an attachment
      // disposition server-side (R3), so no inline render is attempted.
      return (
        <div className="py-4">
          <a href={url} className="btn-primary inline-flex" download>
            Завантажити
            <Download size={16} />
          </a>
        </div>
      )
    }
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
    // Text-family allowlist by the signed key's extension (ratify Р1/Р2, крок Б).
    // Total: every branch returns; the final else covers docx and any future
    // extension with an honest no-preview notice, never a broken iframe.
    const ext = extOf(url)
    if (ext === 'pdf') {
      // F5 (task-code-materials): the served-file iframe is sandboxed (no
      // scripts, no same-origin) for every type EXCEPT pdf — the built-in pdf
      // viewer breaks under sandbox, and the spoofed-pdf-MIME risk is accepted
      // (author→student trust boundary).
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
    if (ext === 'md' || ext === 'markdown') {
      return <MarkdownMaterial url={url} />
    }
    if (ext === 'txt' || ext === 'html' || ext === 'htm') {
      // Best-effort inline; sandboxed (no scripts, no same-origin).
      return (
        <div>
          <iframe
            src={url}
            title={item.label}
            sandbox=""
            className="w-full h-[60vh] rounded-lg border border-canvas-dark/40 bg-white"
          />
          <OpenLink url={url} />
        </div>
      )
    }
    // docx and any future/unknown extension → no inline preview, honest notice.
    return (
      <div className="py-8 text-center">
        <p className="text-ink-muted">
          Попередній перегляд для цього формату недоступний. Завантажте файл, щоб
          переглянути його на своєму пристрої.
        </p>
        <OpenLink url={url} primary />
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
