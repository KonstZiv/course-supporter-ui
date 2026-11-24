import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useT } from '../../i18n/LanguageContext'
import { passRule, type CriterionFormItem } from '../../utils/criteriaRules'

export interface EditorBarProps {
  unsaved: boolean
  formCriteria: CriterionFormItem[]
  saving: boolean
  hasErrors: boolean
  saveDisabled?: boolean
  onSave: () => void
  onRevealErrors?: () => void
  onCancel: () => void
}

/**
 * Sticky action bar at the bottom of the criteria editor (spec 3.К7).
 * Shows unsaved status, live pass rule verdict, save and cancel buttons.
 */
export function EditorBar({
  unsaved,
  formCriteria,
  saving,
  hasErrors,
  saveDisabled = false,
  onSave,
  onRevealErrors,
  onCancel,
}: EditorBarProps) {
  const t = useT()

  // Live pass rule calculated against the current form items in author layer
  const rule = passRule({
    layer: 'author',
    criteria: formCriteria,
  })

  const isHardDisabled = saving || saveDisabled || !unsaved
  const isSaveDisabled = isHardDisabled || hasErrors
  const saveTooltip = hasErrors ? t('panel.criteria.finishFirst') : undefined

  const handleSaveClick = () => {
    if (isHardDisabled) return
    if (hasErrors) {
      onRevealErrors?.()
      return
    }
    onSave()
  }

  return (
    <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-canvas-dark/40 shadow-lg py-3 px-6 mt-8">
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status and live pass rule */}
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'inline-block h-2 w-2 rounded-full shrink-0',
                unsaved ? 'bg-amber' : 'bg-forest',
              )}
            />
            <span className="text-xs font-semibold text-ink uppercase tracking-wider">
              {unsaved
                ? t('panel.criteria.unsaved')
                : t('panel.criteria.nothingToSave')}
            </span>
          </div>

          <p className="text-xs text-ink-muted">
            {rule.kind === 'strict'
              ? t('panel.criteria.pass.strict', {
                  count: rule.count,
                  threshold: rule.threshold,
                })
              : t('panel.criteria.pass.score', {
                  threshold: rule.threshold,
                })}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="btn-secondary text-sm px-4 py-2"
          >
            {t('panel.criteria.cancel')}
          </button>

          <button
            type="button"
            disabled={isHardDisabled}
            aria-disabled={isSaveDisabled ? 'true' : undefined}
            title={saveTooltip}
            onClick={handleSaveClick}
            className={clsx(
              'btn-primary text-sm px-4 py-2 flex items-center gap-2',
              isSaveDisabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? t('panel.criteria.saving') : t('panel.criteria.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
