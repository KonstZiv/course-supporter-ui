import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ROLES_INTRO } from './rolesIntro'

interface RolesIntroModalProps {
  open: boolean
  // First visit: closable ONLY via the acknowledge button — no X, backdrop or
  // Esc dismiss. The voluntary «Навіщо це?» reopen passes ``false``, making the
  // block freely dismissable and requiring no acknowledgement.
  requireAck: boolean
  onAcknowledge: () => void
  onClose: () => void
}

// №21 A-UI-1: the educational block for the file-role confirm screen. Copy and
// the "seen" flag live in ./rolesIntro (single source of the strings).
export function RolesIntroModal({
  open,
  requireAck,
  onAcknowledge,
  onClose,
}: RolesIntroModalProps) {
  useEffect(() => {
    if (!open || requireAck) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, requireAck, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={requireAck ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ROLES_INTRO.title}
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-card-lg p-6"
      >
        <h2 className="font-display text-xl text-ink mb-3">{ROLES_INTRO.title}</h2>

        <div className="space-y-3 text-sm text-ink leading-relaxed">
          {ROLES_INTRO.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="font-medium text-ink">{ROLES_INTRO.important}</p>
          <div>
            <p className="mb-1 font-medium">{ROLES_INTRO.strategyHeading}</p>
            <ul className="list-disc pl-5 space-y-1 text-ink-muted">
              {ROLES_INTRO.strategy.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={requireAck ? onAcknowledge : onClose}
            className="rounded-md bg-navy text-white px-4 py-2 text-sm font-medium"
          >
            {requireAck ? ROLES_INTRO.ackLabel : ROLES_INTRO.closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
