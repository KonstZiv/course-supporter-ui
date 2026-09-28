import { AlertTriangle, Sparkles } from 'lucide-react'
import { TEXTS } from './editorTexts'

/**
 * What the model's check found for a question: its doubt about the marks, and
 * its explanation with a way to take the text as the author's own. The block
 * shows the model's words only; the author's own explanation lives in its
 * own field, so the model's stays as it was written (KD20).
 */
export function ModelExplanation({
  explanation,
  doubt,
  onTake,
}: {
  explanation: string | null
  doubt: boolean
  onTake: () => void
}) {
  if (explanation === null && !doubt) return null
  return (
    <div className="space-y-2">
      {doubt && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-pale p-3 text-sm text-amber-dark">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{TEXTS.doubtText}</p>
        </div>
      )}
      {explanation !== null && (
        <div className="rounded-lg bg-navy/5 border border-navy/15 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-navy">
            <Sparkles size={13} />
            {TEXTS.modelExplanation}
          </p>
          <p
            className="mt-1.5 text-sm text-ink-light whitespace-pre-wrap break-words"
            data-testid="model-explanation"
          >
            {explanation}
          </p>
          <button
            type="button"
            className="btn-ghost btn-sm mt-2 -ml-2"
            onClick={onTake}
          >
            {TEXTS.takeModelText}
          </button>
        </div>
      )}
    </div>
  )
}
