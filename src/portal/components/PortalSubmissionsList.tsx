import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, RotateCw } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalSubmissionListItem, PortalVerdict } from '../types'
import { statusBucket } from '../terminalStatus'
import { PortalReviewDetail } from './PortalReviewDetail'

// Compact per-attempt status chip (one attempt, not the overlay). Mirrors
// SubmissionBadge's buckets but reads the attempt's OWN status/score/verdict.
function AttemptChip({
  status,
  score,
  verdict,
}: {
  status: string
  score: number | null
  verdict: PortalVerdict | null
}) {
  const base = 'text-xs px-2 py-0.5 rounded-full whitespace-nowrap'
  const bucket = statusBucket(status)
  if (bucket === 'error') {
    return <span className={`${base} bg-coral-pale text-coral`}>Помилка</span>
  }
  if (bucket === 'pending') {
    return <span className={`${base} bg-amber-pale text-amber-dark`}>На перевірці</span>
  }
  if (score !== null) {
    const passed = verdict?.passed ?? false
    const tone = passed ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
    return (
      <span className={`${base} ${tone}`}>
        {score}/100 · {passed ? 'зараховано' : 'не зараховано'}
      </span>
    )
  }
  return <span className={`${base} bg-forest-pale text-forest`}>Перевірено</span>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })
}

// "My attempts" for one task (Phase 6 / T4b, c3b; Q1 — a section in the task
// panel, below the submit form). Lists the student's own attempts (newest-first
// from the backend); a row expands inline to the review detail. Async states
// are explicit; 401 is centralised in portalClient. ``reloadKey`` bumps on a
// successful submit (Q7) so a new attempt appears; a manual refresh button
// covers the in-flight → reviewed transition (Q5 — no polling for MVP).
export function PortalSubmissionsList({
  taskId,
  reloadKey,
}: {
  taskId: string
  reloadKey: number
}) {
  const [items, setItems] = useState<PortalSubmissionListItem[] | null>(null)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setItems(null)
    setError('')
    portalApi
      .submissions(taskId)
      .then((rows) => {
        if (active) setItems(rows)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError('Не вдалося завантажити спроби.')
      })
    return () => {
      active = false
    }
  }, [taskId, reloadKey, refreshNonce])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-ink">Мої спроби</h3>
        <button
          onClick={() => setRefreshNonce((n) => n + 1)}
          aria-label="Оновити список спроб"
          className="btn-ghost btn-sm"
        >
          <RotateCw size={14} />
          Оновити
        </button>
      </div>

      {items === null && !error && (
        <div className="flex items-center gap-2 text-ink-muted text-sm py-3">
          <Loader2 size={16} className="animate-spin" />
          Завантаження…
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">{error}</div>
      )}
      {items && items.length === 0 && (
        <div className="text-sm text-ink-muted">Ще немає спроб.</div>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((it) => {
            const open = openId === it.id
            return (
              <li key={it.id} className="rounded-xl border border-canvas-dark/40">
                <button
                  onClick={() => setOpenId(open ? null : it.id)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left"
                >
                  {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <AttemptChip status={it.status} score={it.score} verdict={it.verdict} />
                  <span className="text-xs text-ink-muted ml-auto whitespace-nowrap">
                    {formatDate(it.created_at)}
                  </span>
                </button>
                {it.original_filename && (
                  <div className="px-3 pb-1 text-xs text-ink-muted truncate">
                    {it.original_filename}
                  </div>
                )}
                {open && (
                  <div className="px-3 pb-3 pt-1 border-t border-canvas-dark/30">
                    <PortalReviewDetail submissionId={it.id} status={it.status} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
