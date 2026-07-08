import { useEffect, useState } from 'react'
import { X, Loader2, Download } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMaterialItem, PortalMediaResponse, PortalTaskBase } from '../types'
import { PortalMaterialView } from './PortalMaterialView'
import { PortalSubmitForm } from './PortalSubmitForm'
import { PortalSubmissionsList } from './PortalSubmissionsList'

// KD18 P5: the dedicated base-download section for a project task, driven by
// ``item.base``. ready → an active download button (fetches a FRESH presigned
// original on click — one-shot, never cached because it expires — and opens it
// in a new tab); pending / failed → a disabled button + a hint; base === null →
// nothing rendered (a base-less project, submit is still allowed). base === null
// and a non-ready state are DISTINCT states, never collapsed.
function ProjectBaseSection({
  taskId,
  base,
}: {
  taskId: string
  base: PortalTaskBase
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const ready = base.state === 'ready'

  const download = () => {
    if (downloading) return
    setError('')
    setDownloading(true)
    portalApi
      .base(taskId)
      .then((d) => {
        // One-shot presigned URL — never cache it (it expires); open a new tab.
        window.open(d.original_url, '_blank')
      })
      .catch((err) => {
        // The base route's distinct 404 ("No base is available…") vs a generic
        // access 404 ("Task not found.") both arrive as body.detail — show it.
        const body =
          err instanceof PortalApiError
            ? (err.body as { detail?: unknown } | null)
            : null
        setError(
          typeof body?.detail === 'string'
            ? body.detail
            : 'Не вдалося завантажити базовий проєкт.',
        )
      })
      .finally(() => setDownloading(false))
  }

  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm text-ink">Базовий проєкт</h3>
      <button
        type="button"
        onClick={download}
        disabled={!ready || downloading}
        className="btn-secondary btn-sm"
      >
        {downloading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        Завантажити базовий проєкт
      </button>
      {!ready && (
        <p className="text-xs text-ink-muted">
          {base.state === 'pending'
            ? 'Базовий проєкт готується — спробуйте пізніше.'
            : 'Базовий проєкт не вдалося обробити.'}
        </p>
      )}
      {error && <p className="text-xs text-coral">{error}</p>}
    </section>
  )
}

// Material viewer panel (Phase 6 / T4b, c2, ratify Q2 — a panel, NOT a route).
// Fetches the media descriptor for the selected tree item and renders it
// originals-only. Async states are explicit (corrective 3): loading + error.
// 404 / network errors are caught HERE and shown in the panel — never an empty
// panel. 401 is NOT caught: it is centralised in portalClient (clear +
// redirect). The presigned URL is fetched fresh on each open (300-min TTL);
// re-opening re-fetches a fresh URL — seamless mid-session refresh is DD-6-B.
//
// c3a: for a task item the brief is followed by the submission form; on a
// successful submit ``onSubmitted`` re-fetches the tree so the overlay flips.
export function PortalMaterialPanel({
  item,
  onClose,
  onSubmitted,
}: {
  item: PortalMaterialItem
  onClose: () => void
  onSubmitted: () => void
}) {
  const [media, setMedia] = useState<PortalMediaResponse | null>(null)
  const [error, setError] = useState('')
  // c3b: a successful submit (c3a calls onSubmitted only on success, never on a
  // duplicate — corrective 1) bumps this so the attempts list re-fetches the new
  // row alongside the tree overlay (Q7).
  const [attemptsReload, setAttemptsReload] = useState(0)

  const handleSubmitted = () => {
    setAttemptsReload((n) => n + 1)
    onSubmitted()
  }

  useEffect(() => {
    let active = true
    setMedia(null)
    setError('')
    portalApi
      .material(item.id)
      .then((m) => {
        if (active) setMedia(m)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError(
          err instanceof PortalApiError && err.status === 404
            ? 'Матеріал недоступний.'
            : 'Не вдалося завантажити матеріал.',
        )
      })
    return () => {
      active = false
    }
  }, [item.id])

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-card-lg w-full max-w-3xl max-h-[85vh]
                   flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-canvas-dark/40">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <h2 className="font-display text-xl text-ink truncate">{item.label}</h2>
            {item.task_type === 'project' && (
              <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-canvas-dark text-ink-muted shrink-0">
                Проєкт
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="btn-ghost btn-sm shrink-0"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-6 py-5 overflow-auto">
          {media === null && !error && (
            <div className="flex items-center justify-center gap-2 text-ink-muted py-12">
              <Loader2 size={18} className="animate-spin" />
              Завантаження…
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">
              {error}
            </div>
          )}
          {media && <PortalMaterialView media={media} item={item} />}

          {item.kind === 'task' && (
            <div className="mt-6 pt-5 border-t border-canvas-dark/40 space-y-8">
              {item.task_type === 'project' && item.base && (
                <ProjectBaseSection taskId={item.id} base={item.base} />
              )}
              <PortalSubmitForm
                taskId={item.id}
                base={item.base}
                onSubmitted={handleSubmitted}
              />
              <PortalSubmissionsList taskId={item.id} reloadKey={attemptsReload} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
