import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookOpen, LogOut } from 'lucide-react'
import { usePortalSession } from '../stores/session'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMe } from '../types'

// Minimal protected landing (Phase 6 / T4b, c1): proves a bearer token grants
// access by calling GET /portal/me. Course/material listing is c2.
export function PortalHomePage() {
  const { tenantId } = useParams()
  const storedName = usePortalSession((s) => s.displayName)
  const clear = usePortalSession((s) => s.clear)
  const navigate = useNavigate()

  const [me, setMe] = useState<PortalMe | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    portalApi
      .me()
      .then(setMe)
      .catch((err) => {
        // 401 is handled inside the client (clear + redirect); anything else
        // is a soft error on this page.
        if (!(err instanceof PortalApiError && err.status === 401)) {
          setError('Не вдалося завантажити профіль.')
        }
      })
  }, [])

  // display_name is optional on the wire (ratify Q5) — never render undefined.
  const name = me?.display_name ?? storedName ?? 'Студент'

  const handleLogout = () => {
    clear()
    navigate(`/${tenantId}/login`, { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-canvas-dark/50 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center">
              <BookOpen size={18} className="text-amber-light" />
            </div>
            <span className="font-display text-xl text-ink">Навчальний портал</span>
          </div>
          <button onClick={handleLogout} className="btn-ghost btn-sm">
            <LogOut size={16} />
            Вийти
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="page-title">Вітаємо, {name}!</h1>
        <p className="page-subtitle">
          {me ? `Ви увійшли як ${me.login}.` : 'Завантаження профілю…'}
        </p>

        {error && (
          <div className="mt-6 p-3 rounded-xl bg-coral-pale text-coral text-sm max-w-md">
            {error}
          </div>
        )}

        <div className="mt-10 card p-8 text-ink-muted">
          Список ваших курсів зʼявиться тут.
        </div>
      </main>
    </div>
  )
}
