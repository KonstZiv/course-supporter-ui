import { AlertTriangle } from 'lucide-react'
import type { DraftCheckState } from '../../types/api'
import { ConfirmDialog } from './ConfirmDialog'
import { TEXTS } from './editorTexts'

// What the second part of the question says, by how far the check got; every
// state but a finished check is a warning: the first students may get their
// score before the explanations exist.
const BY_CHECK: Record<DraftCheckState, { words: string; warn: boolean }> = {
  ready: { words: TEXTS.publishChecked, warn: false },
  not_checked: { words: TEXTS.publishUnchecked, warn: true },
  in_progress: { words: TEXTS.publishChecking, warn: true },
  failed: { words: TEXTS.publishCheckFailed, warn: true },
}

/** "Publish the test?" — a first publication or a new version, and the check. */
export function PublishDialog({
  open,
  firstPublication,
  checkState,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  firstPublication: boolean
  checkState: DraftCheckState
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const check = BY_CHECK[checkState]
  return (
    <ConfirmDialog
      open={open}
      title={TEXTS.publishTitle}
      cancelLabel={TEXTS.cancel}
      confirmLabel={TEXTS.publish}
      confirmClass="btn-accent"
      busy={busy}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>{firstPublication ? TEXTS.firstPublication : TEXTS.newVersion}</p>
      {check.warn ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-pale p-3 text-sm text-amber-dark">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{check.words}</span>
        </p>
      ) : (
        <p>{check.words}</p>
      )}
    </ConfirmDialog>
  )
}
