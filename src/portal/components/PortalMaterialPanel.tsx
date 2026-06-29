import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMaterialItem, PortalMediaResponse } from '../types'
import { PortalMaterialView } from './PortalMaterialView'
import { PortalSubmitForm } from './PortalSubmitForm'
import { PortalSubmissionsList } from './PortalSubmissionsList'

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

          {item.kind === 'task' && (
            <div className="mt-6 pt-5 border-t border-canvas-dark/40 space-y-8">
              <PortalSubmitForm taskId={item.id} onSubmitted={handleSubmitted} />
              <PortalSubmissionsList taskId={item.id} reloadKey={attemptsReload} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
