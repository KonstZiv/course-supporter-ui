import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import { Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalSubmissionDetail } from '../types'
import { errorPhrase, PENDING_LABEL, statusBucket } from '../terminalStatus'

// Inline review detail for one attempt (Phase 6 / T4b, c3b; Q1 — expanded row,
// not a route). Rendered by state (Q6):
//   reviewed  → fetch the detail, render review_markdown (react-markdown, plain
//               CommonMark, NO rehype-raw → safe by default) + score + verdict;
//               the markdown is shown EVEN when not passed (it explains why).
//   error     → the curated terminal-status phrase (terminalStatus); NO markdown,
//               NO fetch — the "why" is FE-derived from the status, never the
//               backend error_message (not on the contract).
//   pending   → "На перевірці"; NO markdown, NO fetch.
export function PortalReviewDetail({
  submissionId,
  status,
}: {
  submissionId: string
  status: string
}) {
  const bucket = statusBucket(status)
  const [detail, setDetail] = useState<PortalSubmissionDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bucket !== 'reviewed') return // error / pending render from status alone
    let active = true
    setDetail(null)
    setError('')
    portalApi
      .submission(submissionId)
      .then((d) => {
        if (active) setDetail(d)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError('Не вдалося завантажити рецензію.')
      })
    return () => {
      active = false
    }
  }, [submissionId, bucket])

  if (bucket === 'error') {
    return (
      <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">
        {errorPhrase(status)}
      </div>
    )
  }

  if (bucket === 'pending') {
    return (
      <div className="p-3 rounded-xl bg-amber-pale text-amber-dark text-sm">
        {PENDING_LABEL} — рецензія зʼявиться, коли перевірка завершиться.
      </div>
    )
  }

  // reviewed
  if (error) {
    return (
      <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">{error}</div>
    )
  }
  if (detail === null) {
    return (
      <div className="flex items-center gap-2 text-ink-muted text-sm py-3">
        <Loader2 size={16} className="animate-spin" />
        Завантаження рецензії…
      </div>
    )
  }

  const passed = detail.verdict?.passed ?? false
  return (
    <div className="space-y-3">
      {detail.score !== null && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-ink">{detail.score}/100</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              passed ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
            }`}
          >
            {passed ? 'зараховано' : 'не зараховано'}
          </span>
        </div>
      )}
      {detail.review_markdown ? (
        <div
          className="text-sm text-ink space-y-2 [&_h1]:font-display [&_h1]:text-lg
                     [&_h2]:font-display [&_h2]:text-base [&_ul]:list-disc [&_ul]:pl-5
                     [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-canvas-dark
                     [&_code]:px-1 [&_code]:rounded [&_a]:text-navy [&_a]:underline"
        >
          <Markdown>{detail.review_markdown}</Markdown>
        </div>
      ) : (
        <div className="text-sm text-ink-muted">Рецензію ще не сформовано.</div>
      )}
    </div>
  )
}
