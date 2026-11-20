import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, RotateCw } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type {
  PortalPresentation,
  PortalSubmissionListItem,
  PortalVerdict,
} from '../types'
import { isReviewed, presentationLabel, stateTone } from '../presentationPhrases'
import { notOpenedCountLabel } from '../rejectionReasons'
import { PortalReviewDetail } from './PortalReviewDetail'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { localeOf, type Language } from '../../i18n/languages'

// Compact per-attempt chip. Reads the server's own answer about THIS attempt
// (mentor-rebuild task 03) — the portal no longer groups lifecycle statuses of
// its own, so the chip here and the badge in the tree cannot disagree.
function AttemptChip({
  presentation,
  score,
  verdict,
}: {
  presentation: PortalPresentation
  score: number | null
  verdict: PortalVerdict | null
}) {
  const language = useLanguage()
  const t = useT()
  const base = 'text-xs px-2 py-0.5 rounded-full whitespace-nowrap'
  const { state } = presentation
  if (!isReviewed(state)) {
    return (
      <span className={`${base} ${stateTone(state)}`}>
        {presentationLabel(language, presentation)}
      </span>
    )
  }
  if (score !== null) {
    const passed = verdict?.passed ?? false
    const tone = passed ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
    return (
      <span className={`${base} ${tone}`}>
        {score}/100 · {passed ? t('portal.verdict.passed') : t('portal.verdict.notPassed')}
      </span>
    )
  }
  return <span className={`${base} bg-forest-pale text-forest`}>
      {t('portal.state.label.reviewed')}
    </span>
}

function formatDate(language: Language, iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(localeOf(language), { dateStyle: 'short', timeStyle: 'short' })
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
  onLoaded,
}: {
  taskId: string
  reloadKey: number
  // Step Д: the ids this list currently shows, reported upward so the submit
  // form can retire its "sent" notice once the attempt is visible here. The
  // list stays the owner of the data; only the ids travel.
  onLoaded?: (ids: string[]) => void
}) {
  const [items, setItems] = useState<PortalSubmissionListItem[] | null>(null)
  const [error, setError] = useState(false)
  const language = useLanguage()
  const t = useT()
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setItems(null)
    setError(false)
    portalApi
      .submissions(taskId)
      .then((rows) => {
        if (!active) return
        setItems(rows)
        onLoaded?.(rows.map((r) => r.id))
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError(true)
      })
    return () => {
      active = false
    }
    // ``onLoaded`` is in the deps because the rule is right to ask: it is
    // called from this effect. The parent passes a setState function, whose
    // identity React keeps stable, so this does not re-fetch on every render.
  }, [taskId, reloadKey, refreshNonce, onLoaded])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-ink">{t('portal.attempts.title')}</h3>
        <button
          onClick={() => setRefreshNonce((n) => n + 1)}
          aria-label={t('portal.attempts.refreshLabel')}
          className="btn-ghost btn-sm"
        >
          <RotateCw size={14} />
          {t('portal.attempts.refresh')}
        </button>
      </div>

      {items === null && !error && (
        <div className="flex items-center gap-2 text-ink-muted text-sm py-3">
          <Loader2 size={16} className="animate-spin" />
          {t('portal.common.loading')}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">
          {t('portal.attempts.loadFailed')}
        </div>
      )}
      {items && items.length === 0 && (
        <div className="text-sm text-ink-muted">{t('portal.attempts.empty')}</div>
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
                  <AttemptChip
                    presentation={it.presentation}
                    score={it.score}
                    verdict={it.verdict}
                  />
                  {it.not_opened.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-pale text-amber-dark whitespace-nowrap">
                      {notOpenedCountLabel(language, it.not_opened.length)}
                    </span>
                  )}
                  <span className="text-xs text-ink-muted ml-auto whitespace-nowrap">
                    {formatDate(language, it.created_at)}
                  </span>
                </button>
                {it.original_filename && (
                  <div className="px-3 pb-1 text-xs text-ink-muted truncate">
                    {it.original_filename}
                  </div>
                )}
                {open && (
                  <div className="px-3 pb-3 pt-1 border-t border-canvas-dark/30">
                    <PortalReviewDetail row={it} />
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
