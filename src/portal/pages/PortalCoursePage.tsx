import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMaterialItem, PortalMaterialTreeNode } from '../types'
import { PortalMaterialTree } from '../components/PortalMaterialTree'
import { PortalMaterialPanel } from '../components/PortalMaterialPanel'

// Course material tree page (Phase 6 / T4b, c2). One call returns the whole
// curated subtree (probe B); the panel opens for the selected material. Async
// states are explicit (corrective 3); a foreign / unenrolled / unknown course
// collapses to a generic 404 on the backend → a "course not found" screen.
export function PortalCoursePage() {
  const { tenantId, rootId } = useParams()
  const navigate = useNavigate()

  const [tree, setTree] = useState<PortalMaterialTreeNode | null>(null)
  const [error, setError] = useState<'notfound' | 'soft' | null>(null)
  const [selected, setSelected] = useState<PortalMaterialItem | null>(null)

  useEffect(() => {
    if (!rootId) return
    let active = true
    setTree(null)
    setError(null)
    portalApi
      .courseMaterials(rootId)
      .then((t) => {
        if (active) setTree(t)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError(
          err instanceof PortalApiError && err.status === 404 ? 'notfound' : 'soft',
        )
      })
    return () => {
      active = false
    }
  }, [rootId])

  const goHome = () => navigate(`/${tenantId}/home`)

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-canvas-dark/50 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={goHome} aria-label="До курсів" className="btn-ghost btn-sm">
            <ArrowLeft size={16} />
            Курси
          </button>
          {tree && (
            <span className="font-display text-xl text-ink truncate">{tree.title}</span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {tree === null && error === null && (
          <div className="flex items-center gap-2 text-ink-muted py-12">
            <Loader2 size={18} className="animate-spin" />
            Завантаження…
          </div>
        )}
        {error === 'notfound' && (
          <div className="card p-8 text-ink-muted">Курс не знайдено.</div>
        )}
        {error === 'soft' && (
          <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm max-w-md">
            Не вдалося завантажити матеріали курсу.
          </div>
        )}
        {tree && (
          <div className="card p-4">
            <PortalMaterialTree root={tree} onSelect={setSelected} />
          </div>
        )}
      </main>

      {selected && (
        <PortalMaterialPanel item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
