import { useEffect, useState } from 'react'
import { MarkdownContent } from './MarkdownContent'
import { Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type {
  PortalDeltaReceipt,
  PortalNotOpened,
  PortalSubmissionDetail,
  PortalSubmissionListItem,
} from '../types'
import { errorPhrase, PENDING_LABEL, statusBucket } from '../terminalStatus'
import {
  formatFileSize,
  notOpenedPhrase,
  rejectionPhrase,
} from '../rejectionReasons'

// KD18 P5 (I2): the delta receipt for a project submission — how it diverged
// from the base + whether the base has since moved on. Rendered ONLY in the
// reviewed bucket (reuses the existing detail fetch; DD-6-D keeps error/pending
// fetch-free). Counts only — the full diff is DD-6-Q, deliberately NOT built.
// The hygiene level is not in the contract, so it is not shown. Absent for a
// non-project submission (delta === null on the parent).
function DeltaReceipt({ delta }: { delta: PortalDeltaReceipt }) {
  return (
    <div className="p-3 rounded-xl bg-canvas-dark/40 text-sm text-ink space-y-1">
      <p className="font-medium">Порівняння з базовим проєктом</p>
      <p className="text-ink-light">
        Змінено {delta.changed}, нових {delta.new}, видалено {delta.deleted}.
      </p>
      {delta.base_version !== null && (
        <p className="text-xs text-ink-muted">
          {delta.is_stale
            ? `Базовий проєкт v${delta.base_version} — автор оновив до v${delta.latest_version}.`
            : `Базовий проєкт v${delta.base_version} (актуальна версія).`}
        </p>
      )}
    </div>
  )
}

// What the checker named but did not read. Shown on a PASSING attempt as well
// as a refused one: a review that quietly rested on part of the work is the
// thing this exists to prevent, and the student cannot tell from a score that
// three of their files never reached the Mentor.
//
// Nothing renders when there is nothing to say — an empty block would train the
// eye to skip the place where the caveat appears.
//
// The service vocabulary stays out: no reason codes, no separators, no layer
// names. Each line is the file, what happened to it in a sentence, and the size
// — because "not read" invites "how much did I lose".
function NotOpenedBlock({ entries }: { entries: PortalNotOpened[] }) {
  if (entries.length === 0) return null
  return (
    <div className="p-3 rounded-xl bg-amber-pale/60 text-sm space-y-1">
      <p className="font-medium text-ink">Не прочитано під час перевірки</p>
      <p className="text-ink-light">
        Ці файли з вашого архіву не розглядалися — рецензія на них не спирається.
      </p>
      <ul className="space-y-0.5 pt-1">
        {entries.map((entry) => (
          <li key={entry.path} className="text-ink-light">
            <span className="font-medium text-ink break-all">{entry.path}</span>
            {' — '}
            {notOpenedPhrase(entry)}{' '}
            <span className="text-ink-muted whitespace-nowrap">
              ({formatFileSize(entry.size)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Inline review detail for one attempt (Phase 6 / T4b, c3b; Q1 — expanded row,
// not a route). Rendered by state (Q6):
//   reviewed  → fetch the detail, render review_markdown via the shared
//               MarkdownContent (react-markdown + GFM, NO rehype-raw) + score
//               + verdict; the markdown is shown EVEN when not passed (it
//               explains why).
//   error     → the curated phrase; NO markdown, NO fetch.
//   pending   → "На перевірці"; NO markdown, NO fetch.
//
// Takes the LIST ROW rather than an id + status. The row already carries the
// rejection code and the unread files, so the error branch explains itself
// without a request — DD-6-D's "error and pending are fetch-free" survives the
// arrival of a reason, which a second fetch here would have cost.
//
// The "why" of a refusal resolves in three layers, in this order:
//   1. the ratified article for the reason code (rejectionReasons)
//   2. the phrase for the delivery status (terminalStatus)
//   3. that module's own generic
// Layer 1 declines by returning null rather than answering generically, which
// is what keeps mismatch and stage2_rejected on their better status phrases.
// The backend's error_message is read at no layer — it is not on the contract.
export function PortalReviewDetail({ row }: { row: PortalSubmissionListItem }) {
  const { id: submissionId, status } = row
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
    const phrase =
      (row.rejection && rejectionPhrase(row.rejection)) ?? errorPhrase(status)
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">{phrase}</div>
        <NotOpenedBlock entries={row.not_opened} />
      </div>
    )
  }

  if (bucket === 'pending') {
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-amber-pale text-amber-dark text-sm">
          {PENDING_LABEL} — рецензія зʼявиться, коли перевірка завершиться.
        </div>
        <NotOpenedBlock entries={row.not_opened} />
      </div>
    )
  }

  // reviewed. The unread files come from the ROW, so the caveat is on screen
  // before the review is — it does not depend on the fetch, and a student
  // should not read a score for a second believing the whole work was graded.
  if (error) {
    return (
      <div className="space-y-3">
        <NotOpenedBlock entries={row.not_opened} />
        <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">{error}</div>
      </div>
    )
  }
  if (detail === null) {
    return (
      <div className="space-y-3">
        <NotOpenedBlock entries={row.not_opened} />
        <div className="flex items-center gap-2 text-ink-muted text-sm py-3">
          <Loader2 size={16} className="animate-spin" />
          Завантаження рецензії…
        </div>
      </div>
    )
  }

  const passed = detail.verdict?.passed ?? false
  return (
    <div className="space-y-3">
      <NotOpenedBlock entries={row.not_opened} />
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
      {detail.delta && <DeltaReceipt delta={detail.delta} />}
      {detail.review_markdown ? (
        <MarkdownContent markdown={detail.review_markdown} />
      ) : (
        <div className="text-sm text-ink-muted">Рецензію ще не сформовано.</div>
      )}
    </div>
  )
}
