import { AlertTriangle } from 'lucide-react'
import type { DraftCheckState } from '../../types/api'
import { useLanguage } from '../../i18n/LanguageContext'
import { ConfirmDialog } from './ConfirmDialog'
import { editorTexts } from './editorTexts'
import type { ActionPrice } from '../../hooks/useActionPrice'
import { PriceCard } from '../billing/PriceCard'

/** "Publish the test?" — a first publication or a new version, and the check. */
export function PublishDialog({
  open,
  firstPublication,
  checkState,
  busy,
  price,
  onCancel,
  onConfirm,
}: {
  open: boolean
  firstPublication: boolean
  checkState: DraftCheckState
  busy: boolean
  /** The price of the explanations a publication asks for; not enough stops it. */
  price?: ActionPrice
  onCancel: () => void
  onConfirm: () => void
}) {
  const language = useLanguage()
  const texts = editorTexts(language)
  // What the second part of the question says, by how far the check got; every
  // state but a finished check is a warning: the first students may get their
  // score before the explanations exist.
  const byCheck: Record<DraftCheckState, { words: string; warn: boolean }> = {
    ready: { words: texts.publishChecked, warn: false },
    not_checked: { words: texts.publishUnchecked, warn: true },
    in_progress: { words: texts.publishChecking, warn: true },
    failed: { words: texts.publishCheckFailed, warn: true },
  }
  const check = byCheck[checkState]
  return (
    <ConfirmDialog
      open={open}
      title={texts.publishTitle}
      cancelLabel={texts.cancel}
      confirmLabel={texts.publish}
      confirmClass="btn-accent"
      busy={busy}
      confirmDisabled={price !== undefined && !price.ready}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>{firstPublication ? texts.firstPublication : texts.newVersion}</p>
      {check.warn ? (
        <p className="flex items-start gap-2 rounded-lg bg-amber-pale p-3 text-sm text-amber-dark">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>{check.words}</span>
        </p>
      ) : (
        <p>{check.words}</p>
      )}
      {price && <PriceCard price={price} />}
    </ConfirmDialog>
  )
}
