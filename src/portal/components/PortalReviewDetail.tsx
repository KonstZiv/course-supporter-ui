import { useEffect, useState } from 'react'
import { MarkdownContent } from './MarkdownContent'
import { RemarkThreads } from './RemarkThreads'
import { Loader2 } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type {
  FeedbackTouch,
  FeedbackValue,
  PortalBillingNote,
  PortalDeltaReceipt,
  PortalNotOpened,
  PortalSubmissionDetail,
  PortalSubmissionListItem,
} from '../types'
import {
  isReviewed,
  presentationLabel,
  presentationPhrase,
  stateTone,
} from '../presentationPhrases'
import {
  formatFileSize,
  notOpenedPhrase,
  rejectionPhrase,
} from '../rejectionReasons'
import { encodingDisplayName, shouldReportEncoding } from '../encodingNames'
import { touchErrorMessage } from '../submissionCodes'
import { costOverReserve } from '../unitsTexts'
import { BuyUnitsLink } from './billing/UnitsCost'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import { Message } from '../../i18n/Message'

// A review held for the student's OWN units: they can buy them, and it then
// goes on by itself. Held for the author's — no action of theirs.
const HELD_FOR_OWN_UNITS = 'awaiting_funds'

// KD18 P5 (I2): the delta receipt for a project submission — how it diverged
// from the base + whether the base has since moved on. Rendered ONLY in the
// reviewed bucket (reuses the existing detail fetch; DD-6-D keeps error/pending
// fetch-free). Counts only — the full diff is DD-6-Q, deliberately NOT built.
// The hygiene level is not in the contract, so it is not shown. Absent for a
// non-project submission (delta === null on the parent).
function DeltaReceipt({ delta }: { delta: PortalDeltaReceipt }) {
  const t = useT()
  return (
    <div className="p-3 rounded-xl bg-canvas-dark/40 text-sm text-ink space-y-1">
      <p className="font-medium">{t('portal.review.delta.title')}</p>
      <p className="text-ink-light">
        {t('portal.review.delta.counts', {
          changed: String(delta.changed),
          new: String(delta.new),
          deleted: String(delta.deleted),
        })}
      </p>
      {delta.base_version !== null && (
        <p className="text-xs text-ink-muted">
          {delta.is_stale
            ? t('portal.review.delta.stale', {
                base: String(delta.base_version),
                latest: String(delta.latest_version),
              })
            : t('portal.review.delta.current', { base: String(delta.base_version) })}
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
  const language = useLanguage()
  const t = useT()
  if (entries.length === 0) return null
  return (
    <div className="p-3 rounded-xl bg-amber-pale/60 text-sm space-y-1">
      <p className="font-medium text-ink">{t('portal.review.notOpened.title')}</p>
      <p className="text-ink-light">{t('portal.review.notOpened.lead')}</p>
      <ul className="space-y-0.5 pt-1">
        {entries.map((entry) => (
          <li key={entry.path} className="text-ink-light">
            <span className="font-medium text-ink break-all">{entry.path}</span>
            {' — '}
            {notOpenedPhrase(language, entry)}{' '}
            <span className="text-ink-muted whitespace-nowrap">
              ({formatFileSize(language, entry.size)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// How the file was actually read, when that is not the ordinary answer (step
// Г2 §2.2). Shown in ALL THREE buckets and read from the LIST ROW, exactly
// like NotOpenedBlock: the error and pending branches never fetch (DD-6-D),
// and a refused attempt is precisely where "your file was not UTF-8" explains
// the most.
//
// Nothing renders on `utf-8` or on null. The first is every ordinary
// submission and would train the eye past the place the caveat appears; the
// second is not silence about a known fact but the absence of one — an
// archive recovers its members individually, a document arrives decoded.
//
// The sentence ends with what to do, because there is something: the student
// saves the next file differently. That is the one action available, and it
// is not available from anywhere else in the interface.
function RecoveredEncodingBlock({ encoding }: { encoding: string | null }) {
  const language = useLanguage()
  if (!shouldReportEncoding(encoding)) return null
  return (
    <div className="p-3 rounded-xl bg-amber-pale/60 text-sm text-ink-light">
      <Message
        id="portal.review.recoveredEncoding"
        values={{
          encoding: encodingDisplayName(language, encoding as string),
          name: (chunks) => <span className="font-medium text-ink">{chunks}</span>,
        }}
      />
    </div>
  )
}

// Notification 6.3 (BIL-E): the review cost more than the units held for it.
// Informative, not an error: the review is whole, the student paid the reserve
// and no more. Only for the kind this build knows; any other says nothing.
function BillingNote({ note }: { note: PortalBillingNote | null }) {
  const language = useLanguage()
  if (note?.kind !== 'cost_over_reserve') return null
  return (
    <div role="note" className="p-3 rounded-xl bg-canvas-dark/40 text-sm text-ink">
      {costOverReserve(language, note.cost_units, note.charged_units)}
    </div>
  )
}

// Task 05: the one question a student is asked about a review, and the answer
// they gave. Shown only where a review is shown — the server refuses an answer
// about a submission that carries none, and a button that leads to a refusal is
// a button that should not be there.
//
// The answer is a CHOICE, not a one-way action: the chosen button stays visibly
// chosen, and pressing the other one changes it. ``aria-pressed`` carries that
// state to a screen reader, which is the only way the choice is visible without
// colour.
//
// State comes in from the server (``own_feedback`` on the detail) and is
// replaced by what the server returns from the answer, rather than by what was
// clicked: the server is where a repeat answer is resolved, so it is also where
// the truth about the current answer lives.
function ReviewTouch({
  submissionId,
  initial,
}: {
  submissionId: string
  initial: FeedbackTouch | null
}) {
  const [touch, setTouch] = useState<FeedbackTouch | null>(initial)
  const [saving, setSaving] = useState<FeedbackValue | null>(null)
  const [error, setError] = useState('')
  const language = useLanguage()
  const t = useT()

  useEffect(() => {
    setTouch(initial)
    setError('')
  }, [initial, submissionId])

  const answer = (value: FeedbackValue) => {
    setSaving(value)
    setError('')
    portalApi
      .touchReview(submissionId, value)
      .then((stored) => setTouch(stored))
      .catch((err) => {
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError(touchErrorMessage(language, err))
      })
      .finally(() => setSaving(null))
  }

  const chosen = touch?.value ?? null
  const options: { value: FeedbackValue; label: string }[] = [
    { value: 'helped', label: t('portal.review.touch.helped') },
    { value: 'not_helped', label: t('portal.review.touch.notHelped') },
  ]

  return (
    <div className="pt-3 border-t border-ink-muted/15 space-y-2">
      <div className="text-sm text-ink">{t('portal.review.touch.question')}</div>
      <div className="flex items-center gap-2">
        {options.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => answer(value)}
            disabled={saving !== null}
            aria-pressed={chosen === value}
            className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
              chosen === value
                ? 'bg-forest-pale text-forest border-forest/30 font-medium'
                : 'bg-transparent text-ink-light border-ink-muted/30 hover:bg-amber-pale/40'
            } ${saving !== null ? 'opacity-60 cursor-default' : ''}`}
          >
            {label}
          </button>
        ))}
        {saving !== null && (
          <Loader2 size={14} className="animate-spin text-ink-muted" />
        )}
      </div>
      {chosen !== null && error === '' && (
        <div className="text-xs text-ink-muted">
          {t('portal.review.touch.thanks')}
        </div>
      )}
      {error !== '' && <div className="text-xs text-coral">{error}</div>}
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
// Two blocks ride above all three, drawn from the LIST ROW: how the file was
// read (§2.2) and which of its files were not (c3b). Both are facts about the
// submission rather than about the review, so neither waits on the fetch.
//
// Takes the LIST ROW rather than an id + status. The row already carries the
// rejection code, the unread files and the encoding, so the error branch
// explains itself without a request — DD-6-D's "error and pending are
// fetch-free" survives the arrival of all three, which a second fetch here
// would have cost.
//
// The "why" of a refusal resolves in three layers, in this order:
//   1. the ratified article for the reason code (rejectionReasons)
//   2. the phrase for the state the server reported (presentationPhrases)
//   3. that module's own generic
// Layer 1 declines by returning null rather than answering generically, which
// is what keeps mismatch and stage2_rejected on their better status phrases.
// The backend's error_message is read at no layer — it is not on the contract.
export function PortalReviewDetail({ row }: { row: PortalSubmissionListItem }) {
  const { id: submissionId, presentation } = row
  const reviewed = isReviewed(presentation.state)
  const [detail, setDetail] = useState<PortalSubmissionDetail | null>(null)
  const [error, setError] = useState(false)
  const language = useLanguage()
  const t = useT()

  useEffect(() => {
    if (!reviewed) return // every other state renders from the row alone
    let active = true
    setDetail(null)
    setError(false)
    portalApi
      .submission(submissionId)
      .then((d) => {
        if (active) setDetail(d)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setError(true)
      })
    return () => {
      active = false
    }
  }, [submissionId, reviewed])

  if (!reviewed) {
    // One branch for the four states that have no review to show. The sentence
    // is the server's answer put into words (mentor-rebuild task 03): the
    // article for the reason code where the doors left one — which is how the
    // file-specific lines survive — else the phrase for the state.
    //
    // ``rejection`` is still consulted first: its articles know the FILE, and
    // the state cannot.
    const phrase =
      (row.rejection && rejectionPhrase(language, row.rejection)) ??
      presentationPhrase(language, presentation)
    return (
      <div className="space-y-3">
        <div className={`p-3 rounded-xl text-sm ${stateTone(presentation.state)}`}>
          {presentationLabel(language, presentation)} — {phrase}
          {presentation.reason_code === HELD_FOR_OWN_UNITS && (
            <p className="mt-2">
              <BuyUnitsLink />
            </p>
          )}
        </div>
        <RecoveredEncodingBlock encoding={row.recovered_encoding} />
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
        <RecoveredEncodingBlock encoding={row.recovered_encoding} />
        <NotOpenedBlock entries={row.not_opened} />
        <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">
          {t('portal.review.loadFailed')}
        </div>
      </div>
    )
  }
  if (detail === null) {
    return (
      <div className="space-y-3">
        <RecoveredEncodingBlock encoding={row.recovered_encoding} />
        <NotOpenedBlock entries={row.not_opened} />
        <div className="flex items-center gap-2 text-ink-muted text-sm py-3">
          <Loader2 size={16} className="animate-spin" />
          {t('portal.review.loading')}
        </div>
      </div>
    )
  }

  const passed = detail.verdict?.passed ?? false
  return (
    <div className="space-y-3">
      <RecoveredEncodingBlock encoding={row.recovered_encoding} />
      <NotOpenedBlock entries={row.not_opened} />
      <BillingNote note={detail.billing_note ?? null} />
      {detail.score !== null && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-ink">{detail.score}/100</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              passed ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
            }`}
          >
            {passed ? t('portal.verdict.passed') : t('portal.verdict.notPassed')}
          </span>
        </div>
      )}
      {detail.delta && <DeltaReceipt delta={detail.delta} />}
      {detail.review_markdown ? (
        <MarkdownContent markdown={detail.review_markdown} />
      ) : (
        <div className="text-sm text-ink-muted">{t('portal.review.notYet')}</div>
      )}
      {detail.review_markdown && (
        <RemarkThreads
          submissionId={submissionId}
          structure={detail.structure}
        />
      )}
      {detail.review_markdown && (
        <ReviewTouch
          submissionId={submissionId}
          initial={detail.own_feedback}
        />
      )}
    </div>
  )
}
