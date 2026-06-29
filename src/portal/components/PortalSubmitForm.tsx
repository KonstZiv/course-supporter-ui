import { useState } from 'react'
import { Loader2, Upload, CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { portalApi, PortalApiError } from '../api/portalClient'

// Allowed homework extensions + max size MIRROR the backend
// (submission_core.py:49 ALLOWED_HOMEWORK_EXTENSIONS / :47 MAX_HOMEWORK_SIZE).
// This is a client-side convenience ONLY — the server is authoritative and
// returns 422 even if this list drifts; keep it = (or a subset of) the backend.
// Third FE-mirrors-backend case in T4b (cf. the c1 dev-routing comment and the
// c2 source_type-blind-descriptor comment).
const ALLOWED_EXT = [
  '.py', '.js', '.ts', '.java', '.c', '.cpp', '.cs', '.sql',
  '.md', '.txt', '.html', '.ipynb', '.zip', '.gz',
]
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
  onSubmitted,
}: {
  taskId: string
  onSubmitted: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [state, setState] = useState<SubmitState>('idle')
  const [message, setMessage] = useState('')

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
      if (err instanceof PortalApiError && err.status === 422) {
        setMessage(
          `Файл не прийнято. Дозволені типи: ${ALLOWED_EXT.join(', ')} (до 10 МБ).`,
        )
      } else if (err instanceof PortalApiError && err.status === 409) {
        // corrective 3: temporary, not broken — task is visible but not ready.
        setMessage('Завдання ще не готове до подачі. Спробуйте трохи згодом.')
      } else {
        setMessage('Не вдалося надіслати. Перевірте зʼєднання та спробуйте ще раз.')
      }
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
        disabled={!file || state === 'submitting'}
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
    </form>
  )
}
