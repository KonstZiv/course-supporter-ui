import { useEffect, useId, useState } from 'react'
import { Loader2, Upload, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { portalApi, PortalApiError, unitsShortfall } from '../api/portalClient'
import type {
  PortalLanguageEntry,
  PortalTaskBase,
  SubmissionPolicyEntry,
} from '../types'
import { getPortalLanguages } from '../languages'
import { defaultReviewLanguage } from '../reviewLanguage'
import { iso3Of } from '../../i18n/languages'
import { formatFileSize } from '../rejectionReasons'
import { getSubmissionPolicy, policyFor } from '../submissionPolicy'
import { submitErrorMessage } from '../submissionCodes'
import { formatCount, noteLength, STUDENT_NOTE_MAX_CHARS } from '../studentNote'
import { costView } from '../reviewCost'
import { useReviewEstimate } from '../hooks/useReviewEstimate'
import { useUnitsWait } from '../hooks/useUnitsWait'
import { CostCard, UnitsShortPanel } from './billing/UnitsCost'
import { useLanguage, useT } from '../../i18n/LanguageContext'

type SubmitState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error'

// Submission form for a task node (Phase 6 / T4b, c3a). The act of submitting +
// driving the overlay to pending; the read-path (own attempts, review detail,
// terminal-state UX / DD-6-D) is c3b. The three POST outcomes are visually
// distinct (corrective 1): success (new attempt) / duplicate (neutral) /
// error (4xx / network). On success the parent re-fetches the tree so the
// server-computed overlay flips none→pending (corrective: no optimistic drift);
// on duplicate NO re-fetch (no new attempt was created).
//
// It also READS on mount (step Г2 §2.1): the allowed language list. It fails
// soft — the field is not required to submit. The field opens on the language
// of the pages (Г-1 §5, ``defaultReviewLanguage``).
//
// And the price (BIL-E, stage 2b): before a submission the form asks what a
// review of this task costs — on opening, and for every file chosen — and
// says it (``reviewCost``). When the units are short, a panel stands in place
// of the button, the file stays chosen, and the form looks at the units until
// they are enough. While charging is off, nothing of it shows.
export function PortalSubmitForm({
  taskId,
  taskType = null,
  courseLanguage = null,
  base = null,
  listedIds = [],
  onSubmitted,
}: {
  taskId: string
  // Which row of the submission policy applies (step Д). Crosses the wire as a
  // free string, so it is kept as one here and narrowed at the lookup.
  taskType?: string | null
  // Step Д: the course's own language (ISO 639-3) off the tree root, so the
  // "course language" option can send the code it names instead of sending
  // nothing and letting the server fall back to the student's preference.
  // Null only if the root carries none, which a CHECK forbids.
  courseLanguage?: string | null
  // KD18 P5: the active base descriptor for a project task (null for a
  // non-project task or a base-less project). Drives the auto-echo + D5 gating.
  base?: PortalTaskBase | null
  // Ids the attempts list below has loaded. The "sent" notice lives until the
  // attempt it announces is visible there, and not a moment longer — see the
  // effect below.
  listedIds?: string[]
  onSubmitted: (submissionId: string) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('')
  // Empty string is the "course language" option — the absence of a choice,
  // not a choice of nothing. It is never sent (the server reads a blank form
  // value as "not given" anyway, but sending it would still be noise).
  // The review language the student picked in the field; until then the
  // field opens on the default (``defaultReviewLanguage``).
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null)
  const [languages, setLanguages] = useState<PortalLanguageEntry[]>([])
  const [policy, setPolicy] = useState<SubmissionPolicyEntry | null>(null)
  // The attempt this form announced and is still announcing. Cleared when the
  // list below shows it — at which point the notice has nothing left to say.
  const [sentId, setSentId] = useState<string | null>(null)
  // Remounts the file input so a cleared field really is empty, and so picking
  // the SAME file again still fires a change event.
  const [pickerKey, setPickerKey] = useState(0)

  // The reader's language — not the review's (``language`` above).
  const uiLanguage = useLanguage()
  const t = useT()
  const language =
    chosenLanguage ?? defaultReviewLanguage(iso3Of(uiLanguage), courseLanguage, languages)
  // Every option now sends the code it names. "Мовою курсу" used to send
  // nothing, which made the server fall back — to the student's STORED
  // preference first, so a student whose last review was in English got
  // English again under a label promising the course's language. Measured
  // 2026-09-04 on a ukr course. The absence of a choice is no longer the way
  // to ask for the course language; naming it is.
  const responseLanguage = language || courseLanguage || null
  const estimate = useReviewEstimate(taskId, file, responseLanguage)
  const cost = costView(uiLanguage, estimate.outcome, estimate.last)
  useUnitsWait(cost.kind === 'panel' ? cost.threshold : null, estimate.askAgain)
  // The answer is on its way and charging is known to be on: no sending yet.
  const costGated = cost.kind === 'line' && cost.gated

  // The list is a server-side constant, so one fetch per SPA session (the
  // singleton) covers every task panel the student opens.
  useEffect(() => {
    let active = true
    getPortalLanguages()
      .then((items) => {
        if (active) setLanguages(items)
      })
      // A failure leaves the field at "course language" — the same behaviour
      // as before this field existed, and a submission still works.
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  // What the door accepts, for THIS assignment kind (step Д, DD-SP-V). Fails
  // soft exactly like the language list above: a policy that does not arrive
  // leaves the form sending the file and the server answering — the same
  // outcome as before this endpoint existed, and the same one the form
  // already gives when the language list fails.
  useEffect(() => {
    let active = true
    getSubmissionPolicy()
      .then((p) => {
        if (active) setPolicy(policyFor(p, taskType))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [taskType])

  // D5 gating: a project task whose base EXISTS but is not READY blocks submit
  // (the base is not usable yet). base === null (no base attached) is a DISTINCT
  // state — submit is ALLOWED (an all-new delta), no echo is sent. BE-409
  // BASE_NOT_READY stays the authoritative backstop for a render↔submit race.
  const baseNotReady = base != null && base.state !== 'ready'

  // The comment's cap (hotfix 6), counted as the server counts it. Held softly:
  // a longer comment stays in the field whole — a pasted question is never cut
  // short without the student seeing it — and the form will not send it.
  const noteChars = noteLength(note)
  const noteTooLong = noteChars > STUDENT_NOTE_MAX_CHARS
  const noteCounterId = useId()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setState('idle')
    setMessage('')
    setSentId(null)
  }

  // The notice "Рішення надіслано — очікує перевірки" answers a question the
  // attempts list answers better the moment it can: it shows the attempt with
  // its real status. Two answers to one question, one of them frozen at the
  // instant of sending, is how a student ends up reading "очікує перевірки"
  // beside a finished review. So the notice retires when the list adopts it.
  useEffect(() => {
    if (sentId !== null && listedIds.includes(sentId)) {
      setSentId(null)
      setState('idle')
      setMessage('')
    }
  }, [sentId, listedIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || state === 'submitting') return // corrective 4: lock — no double POST
    if (noteTooLong) return // the button is off too; this holds an Enter submit
    if (costGated || cost.kind === 'panel') return // no button; this holds an Enter submit
    // Client size preflight (corrective 2); the server re-checks (422). The
    // cap and the number in the sentence both come from the policy for this
    // assignment kind — a project is allowed ten times what a single file is,
    // and the old literal refused it before the request was ever made. No
    // policy (not loaded, unknown kind) → no preflight, and the server
    // answers.
    if (policy !== null && file.size > policy.max_bytes) {
      setState('error')
      setMessage(
        t('portal.submit.fileTooLarge', { max: formatFileSize(uiLanguage, policy.max_bytes) }),
      )
      return
    }
    setState('submitting')
    setMessage('')
    const fd = new FormData()
    fd.append('file', file)
    if (responseLanguage) fd.append('response_language', responseLanguage)
    if (note.trim()) fd.append('student_note', note.trim())
    // Auto-echo the base snapshot_hash from the descriptor (KD18 P5) — sent ONLY
    // when a READY base is attached (snapshot_hash is null otherwise). The
    // student never sees or types it; base === null → no echo (all-new delta).
    if (base?.snapshot_hash) fd.append('base_snapshot_hash', base.snapshot_hash)
    try {
      const res = await portalApi.submitTask(taskId, fd)
      if (res.duplicate) {
        // corrective 1: neutral, NOT an error; no new attempt → no re-fetch.
        setState('duplicate')
        setMessage(t('portal.submit.duplicate'))
      } else {
        setState('success')
        setMessage(t('portal.submit.sent'))
        // The work is sent; the form is not a record of it. Leaving the file,
        // the note and an enabled button behind invites a second identical
        // submission that only the server's hash check refuses.
        setFile(null)
        setNote('')
        setPickerKey((k) => k + 1)
        setSentId(res.submission_id)
        onSubmitted(res.submission_id) // re-fetch the tree → overlay none→pending
      }
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) return // centralised
      // The server's safeguard: the units are short after all. The same panel,
      // with the server's numbers; the file stays, and nothing is sent again
      // until the student presses the button.
      const shortfall = unitsShortfall(err)
      if (shortfall !== null) {
        setState('idle')
        setMessage('')
        estimate.refused(shortfall)
        return
      }
      setState('error')
      setMessage(submitErrorMessage(uiLanguage, err))
    }
  }

  // Which language "course language" actually offers. Read from the list the
  // field already loaded — the same `name_native || name_en` the named options
  // below use, so the two never disagree about what a code is called. The
  // server serves a native name for every language on its list, read from
  // CLDR, so this reads "українська" for a Ukrainian course. `name_en` is the
  // fallback the contract's nullable type leaves room for.
  //
  // Falls back to the bare wording while the list is still loading, or if the
  // course's code is not on it: an option that names the wrong language would
  // be worse than one that names none.
  const courseLanguageName = languages.find((l) => l.code === courseLanguage)
  const courseLanguageLabel =
    courseLanguageName === undefined
      ? t('portal.submit.courseLanguage')
      : t('portal.submit.courseLanguageNamed', {
          name: courseLanguageName.name_native || courseLanguageName.name_en,
        })

  const tone =
    state === 'success'
      ? 'bg-forest-pale text-forest'
      : state === 'duplicate'
        ? 'bg-navy/10 text-navy'
        : 'bg-coral-pale text-coral'
  const Icon =
    state === 'success' ? CheckCircle2 : state === 'duplicate' ? Info : AlertCircle

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-display text-lg text-ink">{t('portal.submit.title')}</h3>
      <input
        key={pickerKey}
        type="file"
        accept={policy?.accept.join(',')}
        onChange={handleFile}
        aria-label={t('portal.submit.fileLabel')}
        className="block w-full text-sm text-ink-light file:mr-3 file:rounded-lg
                   file:border-0 file:bg-canvas-dark file:px-3 file:py-1.5
                   file:text-ink file:cursor-pointer"
      />
      <label className="block">
        <span className="block text-sm font-medium text-ink mb-1.5">
          {t('portal.submit.reviewLanguage')}
        </span>
        <select
          value={language}
          onChange={(e) => setChosenLanguage(e.target.value)}
          className="input"
        >
          {/* Hidden when the root carries no language — a CHECK forbids it,
              so this is a malformed root rather than a state to design for,
              and an option that cannot say which language it means is worse
              than no option: the named languages below still work. */}
          {courseLanguage !== null && (
            <option value="">{courseLanguageLabel}</option>
          )}
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {/* Each language named as it names itself, from the CLDR-backed
                  ``name_native`` the server sends for every entry on its list.
                  ``name_en`` is what the nullable contract falls back to. */}
              {l.name_native || l.name_en}
            </option>
          ))}
        </select>
      </label>
      <div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('portal.submit.notePlaceholder')}
          aria-label={t('portal.submit.noteLabel')}
          aria-describedby={noteCounterId}
          aria-invalid={noteTooLong || undefined}
          rows={2}
          className="input"
        />
        <div
          id={noteCounterId}
          className={`mt-1 flex items-start justify-between gap-3 text-xs ${
            noteTooLong ? 'text-coral' : 'text-ink-muted'
          }`}
        >
          <span aria-live="polite">
            {noteTooLong &&
              t('portal.submit.noteTooLong', { max: formatCount(STUDENT_NOTE_MAX_CHARS) })}
          </span>
          <span className="shrink-0 tabular-nums">
            {formatCount(noteChars)} / {formatCount(STUDENT_NOTE_MAX_CHARS)}
          </span>
        </div>
      </div>
      <div aria-live="polite" className="empty:hidden">
        {cost.kind === 'line' && <p className="text-sm text-ink-light">{cost.text}</p>}
        {cost.kind === 'refusal' && cost.text !== message && (
          <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-coral-pale text-coral">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {cost.text}
          </div>
        )}
        {cost.kind === 'card' && <CostCard text={cost.text} nowEnough={cost.nowEnough} />}
      </div>
      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${tone}`}>
          <Icon size={16} className="shrink-0 mt-0.5" />
          {message}
        </div>
      )}
      {cost.kind === 'panel' ? (
        <UnitsShortPanel text={cost.text} fileChosen={file !== null} />
      ) : (
        <button
          type="submit"
          disabled={
            !file ||
            state === 'submitting' ||
            state === 'duplicate' ||
            baseNotReady ||
            noteTooLong ||
            costGated
          }
          title={baseNotReady ? t('portal.submit.baseNotReadyTitle') : undefined}
          className="btn-primary"
        >
          {state === 'submitting' ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Upload size={16} />
              {t('portal.submit.send')}
            </>
          )}
        </button>
      )}
      {baseNotReady && (
        <p className="text-xs text-ink-muted">
          {t('portal.submit.baseNotReadyNote')}
        </p>
      )}
    </form>
  )
}
