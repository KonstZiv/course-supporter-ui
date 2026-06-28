import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMaterialItem, PortalMediaResponse } from '../types'
import { PortalMaterialView } from './PortalMaterialView'

// Material viewer panel (Phase 6 / T4b, c2, ratify Q2 — a panel, NOT a route).
// Fetches the media descriptor for the selected tree item and renders it
// originals-only. Async states are explicit (corrective 3): loading + error.
// 404 / network errors are caught HERE and shown in the panel — never an empty
// panel. 401 is NOT caught: it is centralised in portalClient (clear +
// redirect). The presigned URL is fetched fresh on each open (300-min TTL);
// re-opening re-fetches a fresh URL — seamless mid-session refresh is DD-6-B.
export function PortalMaterialPanel({
  item,
  onClose,
}: {
  item: PortalMaterialItem
  onClose: () => void
}) {
  const [media, setMedia] = useState<PortalMediaResponse | null>(null)
  const [error, setError] = useState('')

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
          <h2 className="font-display text-xl text-ink truncate pr-4">{item.label}</h2>
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
        </div>
      </div>
    </div>
  )
}
