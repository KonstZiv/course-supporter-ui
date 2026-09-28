import { Loader2 } from 'lucide-react'
import { Modal } from '../ui/Modal'

/**
 * A window that asks before something that cannot be taken back — its words,
 * then "cancel" and the action, in the program's own window.
 */
export function ConfirmDialog({
  open,
  title,
  cancelLabel,
  confirmLabel,
  confirmClass = 'btn-primary',
  busy = false,
  onCancel,
  onConfirm,
  children,
}: {
  open: boolean
  title: string
  cancelLabel: string
  confirmLabel: string
  confirmClass?: 'btn-primary' | 'btn-accent' | 'btn-danger'
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <div className="space-y-3 text-body text-ink-light">{children}</div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
