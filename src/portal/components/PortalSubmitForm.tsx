import { useState } from 'react'
import { Loader2, Upload, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalTaskBase } from '../types'
import { submitErrorMessage } from '../submissionCodes'

// What the file picker offers, mirroring the backend's accepted set (gates
// FORMATS.md — the same 41 the server derives as
// _PROSE | CODE_EXTENSIONS | _ARCHIVES | _DOCUMENTS). Grouped the way the list
// was ratified, by reason rather than alphabetically, so a future edit lands in
// the group whose reason it shares.
//
// This is a COPY with no lock behind it: nothing fails when the server's set
// moves and this one does not. Being short by one means the student cannot pick
// a format the server would have accepted — which is exactly what happened
// before this pass, when .docx and .pdf were added server-side and 27 of the 41
// stayed unselectable in the dialog. The fix is a submission-policy endpoint
// this form reads instead (recorded as debt; TASK §2), not more care here.
const PROSE = ['md', 'txt']
const CODE = [
  'py', 'ipynb', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'java', 'kt', 'kts',
  'cs', 'go', 'rs', 'php', 'rb', 'c', 'h', 'cpp', 'hpp', 'cc', 'swift', 'dart',
  'html', 'htm', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'toml', 'sql', 'sh',
]
const DOCUMENTS = ['docx', 'pdf']
const ARCHIVES = ['zip', 'gz', 'tgz']
const ALLOWED_EXT = [...PROSE, ...CODE, ...DOCUMENTS, ...ARCHIVES].map((e) => `.${e}`)

// The same copy problem as ALLOWED_EXT, and knowingly left alone: a project
// submission is allowed 100 MB server-side, so this cuts off a legitimate one
// before it is ever sent. Left for the policy endpoint to fix along with the
// format list, rather than adding a second hand-maintained number here.
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

type SubmitState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error'

// Submission form for a task node (Phase 6 / T4b, c3a). The act of submitting +
// driving the overlay to pending; the read-path (own attempts, review detail,
// terminal-state UX / DD-6-D) is c3b. The three POST outcomes are visually
// distinct (corrective 1): success (new attempt) / duplicate (neutral) /
// error (4xx / network). On success the parent re-fetches the tree so the
// server-computed overlay flips none→pending (corrective: no optimistic drift);
// on duplicate NO re-fetch (no new attempt was created).
export function PortalSubmitForm({
  taskId,
  base = null,
  onSubmitted,
}: {
  taskId: string
  // KD18 P5: the active base descriptor for a project task (null for a
  // non-project task or a base-less project). Drives the auto-echo + D5 gating.
  base?: PortalTaskBase | null
  onSubmitted: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('')

  // D5 gating: a project task whose base EXISTS but is not READY blocks submit
  // (the base is not usable yet). base === null (no base attached) is a DISTINCT
  // state — submit is ALLOWED (an all-new delta), no echo is sent. BE-409
  // BASE_NOT_READY stays the authoritative backstop for a render↔submit race.
  const baseNotReady = base != null && base.state !== 'ready'

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setState('idle')
    setMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || state === 'submitting') return // corrective 4: lock — no double POST
    // Client size preflight (corrective 2); the server re-checks (422).
    if (file.size > MAX_SIZE) {
      setState('error')
      setMessage('Файл завеликий — максимум 10 МБ.')
      return
    }
    setState('submitting')
    setMessage('')
    const fd = new FormData()
    fd.append('file', file)
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
        onSubmitted() // re-fetch the tree → overlay none→pending
      }
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) return // centralised
      setState('error')
      setMessage(submitErrorMessage(err))
    }
  }

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
        type="file"
        accept={ALLOWED_EXT.join(',')}
        onChange={handleFile}
        aria-label="Файл рішення"
        className="block w-full text-sm text-ink-light file:mr-3 file:rounded-lg
                   file:border-0 file:bg-canvas-dark file:px-3 file:py-1.5
                   file:text-ink file:cursor-pointer"
      />
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
        disabled={!file || state === 'submitting' || baseNotReady}
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
