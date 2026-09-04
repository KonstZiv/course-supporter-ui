import { AlertCircle, X } from 'lucide-react'

// What did not arrive, and why — the author's own surface (step Г2 §2.5,
// closing DD-2.2-AG).
//
// It replaces window.alert(), which was wrong in three ways at once: it blocks
// the page until dismissed, it cannot be styled or read alongside the thing it
// is about, and its text is gone the moment it is closed — so an author who
// clicked past it had no way back to what the server had said.
//
// A sibling of UploadProgressView rather than a branch inside it, because the
// two have opposite lifetimes. Progress is transient and disappears when the
// batch ends; this outlives the batch by design and leaves only when the
// author closes it. Never on a timer: a refusal that vanishes while it is
// being read is the failure mode this exists to end.
//
// The text is already product-language when it arrives here — the resolver
// (authoredRejectionMessage) maps a coded rejection through the dictionary and
// degrades an unfamiliar one to a generic sentence, so no raw server string
// reaches this component. It renders what it is given and adds nothing.
export function UploadFailuresView({
  failures,
  onDismiss,
}: {
  failures: string[]
  onDismiss: () => void
}) {
  if (failures.length === 0) return null
  return (
    <div
      role="alert"
      className="border border-coral/40 bg-coral-pale rounded-xl p-3 flex gap-2"
    >
      <AlertCircle size={16} className="text-coral shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium text-coral">
          {failures.length === 1 ? 'Файл не завантажено' : 'Деякі файли не завантажено'}
        </p>
        <ul className="space-y-1">
          {failures.map((message, i) => (
            <li
              // The list is a snapshot of one gesture and never reorders, so
              // the index is a stable key here; two files can legitimately be
              // refused with the very same sentence, which rules out the text.
              key={i}
              // The pre-send checks build one entry out of several lines
              // (a heading plus the files it names), so the breaks they wrote
              // have to survive.
              className="text-sm text-ink whitespace-pre-line break-words"
            >
              {message}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Закрити"
        className="shrink-0 p-1 rounded-lg text-coral hover:bg-coral/10
                   transition-colors cursor-pointer self-start"
      >
        <X size={14} />
      </button>
    </div>
  )
}
