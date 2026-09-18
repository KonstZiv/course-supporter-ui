import { useEffect, useState } from 'react'
import { Loader2, Upload, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type {
  PortalLanguageEntry,
  PortalTaskBase,
  SubmissionPolicyEntry,
} from '../types'
import { getPortalLanguages } from '../languages'
import { formatFileSize } from '../rejectionReasons'
import { getSubmissionPolicy, policyFor } from '../submissionPolicy'
import { submitErrorMessage } from '../submissionCodes'

type SubmitState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error'

// Submission form for a task node (Phase 6 / T4b, c3a). The act of submitting +
// driving the overlay to pending; the read-path (own attempts, review detail,
// terminal-state UX / DD-6-D) is c3b. The three POST outcomes are visually
// distinct (corrective 1): success (new attempt) / duplicate (neutral) /
// error (4xx / network). On success the parent re-fetches the tree so the
// server-computed overlay flips none→pending (corrective: no optimistic drift);
// on duplicate NO re-fetch (no new attempt was created).
//
// It also READS on mount now (step Г2 §2.1): the allowed language list, and the
// student's standing language preference. Both fail soft — neither is required
// to submit, and a submission with no language named is resolved server-side.
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
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState<PortalLanguageEntry[]>([])
  const [policy, setPolicy] = useState<SubmissionPolicyEntry | null>(null)
  // The attempt this form announced and is still announcing. Cleared when the
  // list below shows it — at which point the notice has nothing left to say.
  const [sentId, setSentId] = useState<string | null>(null)
  // Remounts the file input so a cleared field really is empty, and so picking
  // the SAME file again still fires a change event.
  const [pickerKey, setPickerKey] = useState(0)

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

  // The student's standing preference, read here rather than held in the
  // session store or a shared cache. A cache would need invalidating in two
  // places — after the recovery-email save, and after every submission that
  // names a language, because the server rewrites the column then — which is
  // a module with two divergence points to save one light request per panel
  // open. Read on mount instead, and let the server stay the single truth.
  useEffect(() => {
    let active = true
    portalApi
      .me()
      .then((me) => {
        if (active && me.preferred_language) setLanguage(me.preferred_language)
      })
      // No preference readable → the field stays on "course language", which
      // is what the server would fall back to anyway.
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  // D5 gating: a project task whose base EXISTS but is not READY blocks submit
  // (the base is not usable yet). base === null (no base attached) is a DISTINCT
  // state — submit is ALLOWED (an all-new delta), no echo is sent. BE-409
  // BASE_NOT_READY stays the authoritative backstop for a render↔submit race.
  const baseNotReady = base != null && base.state !== 'ready'

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
    // Client size preflight (corrective 2); the server re-checks (422). The
    // cap and the number in the sentence both come from the policy for this
    // assignment kind — a project is allowed ten times what a single file is,
    // and the old literal refused it before the request was ever made. No
    // policy (not loaded, unknown kind) → no preflight, and the server
    // answers.
    if (policy !== null && file.size > policy.max_bytes) {
      setState('error')
      setMessage(`Файл завеликий — максимум ${formatFileSize(policy.max_bytes)}.`)
      return
    }
    setState('submitting')
    setMessage('')
    const fd = new FormData()
    fd.append('file', file)
    // Every option now sends the code it names. "Мовою курсу" used to send
    // nothing, which made the server fall back — to the student's STORED
    // preference first, so a student whose last review was in English got
    // English again under a label promising the course's language. Measured
    // 2026-09-04 on a ukr course. The absence of a choice is no longer the way
    // to ask for the course language; naming it is.
    const chosen = language || courseLanguage
    if (chosen) fd.append('response_language', chosen)
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
        setMessage('Цей файл уже подано раніше — нову спробу не створено.')
      } else {
        setState('success')
        setMessage('Рішення надіслано — очікує перевірки.')
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
      setState('error')
      setMessage(submitErrorMessage(err))
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
      ? 'Мовою курсу'
      : `Мовою курсу (${courseLanguageName.name_native || courseLanguageName.name_en})`

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
      <h3 className="font-display text-lg text-ink">Надіслати рішення</h3>
      <input
        key={pickerKey}
        type="file"
        accept={policy?.accept.join(',')}
        onChange={handleFile}
        aria-label="Файл рішення"
        className="block w-full text-sm text-ink-light file:mr-3 file:rounded-lg
                   file:border-0 file:bg-canvas-dark file:px-3 file:py-1.5
                   file:text-ink file:cursor-pointer"
      />
      <label className="block">
        <span className="block text-sm font-medium text-ink mb-1.5">
          Мова рецензії
        </span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
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
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Коментар або питання (необовʼязково)"
        aria-label="Коментар"
        rows={2}
        className="input"
      />
      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${tone}`}>
          <Icon size={16} className="shrink-0 mt-0.5" />
          {message}
        </div>
      )}
      <button
        type="submit"
        disabled={
          !file || state === 'submitting' || state === 'duplicate' || baseNotReady
        }
        title={baseNotReady ? 'Базовий проєкт ще не готовий.' : undefined}
        className="btn-primary"
      >
        {state === 'submitting' ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <Upload size={16} />
            Надіслати
          </>
        )}
      </button>
      {baseNotReady && (
        <p className="text-xs text-ink-muted">
          Подача стане доступною, коли автор підготує базовий проєкт.
        </p>
      )}
    </form>
  )
}
