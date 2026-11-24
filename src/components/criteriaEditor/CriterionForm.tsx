import { useState } from 'react'
import { clsx } from 'clsx'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'
import { CRITERIA_LIMITS, type CriterionFormItem } from '../../utils/criteriaRules'
import type { CriteriaWeight, CriteriaCheckMethod } from '../../types/api'
import { MandatorySwitch } from './MandatorySwitch'
import { PointsField } from './PointsField'
import { ConceptsPicker } from './ConceptsPicker'
import { ConfirmDialog } from '../testEditor/ConfirmDialog'

export interface CriterionFormProps {
  criterion: CriterionFormItem
  index: number
  totalCount: number
  availableConcepts: string[]
  taskType: string | null
  disabled?: boolean
  serverFieldErrors?: string[]
  saveAttempted?: boolean
  onChange: (patch: Partial<CriterionFormItem>) => void
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
}

const WEIGHTS: CriteriaWeight[] = ['must', 'should', 'may']

/**
 * Editorial card for a single criterion in the criteria editor (spec 3.К7).
 */
export function CriterionForm({
  criterion,
  index,
  totalCount,
  availableConcepts,
  taskType,
  disabled = false,
  serverFieldErrors = [],
  saveAttempted = false,
  onChange,
  onMove,
  onRemove,
}: CriterionFormProps) {
  const t = useT()
  const [pendingMethod, setPendingMethod] = useState<CriteriaCheckMethod | null>(null)
  const [textTouched, setTextTouched] = useState(false)
  const [evidenceTouched, setEvidenceTouched] = useState(false)

  const isNew = criterion.isNew || !criterion.id
  const title = isNew
    ? t('panel.criteria.criterion.new')
    : t('panel.criteria.criterion.heading', { id: criterion.id! })

  const trimmedText = criterion.text.trim()
  const textEmpty = trimmedText.length === 0
  const textTooLong = trimmedText.length > CRITERIA_LIMITS.textChars
  const textError = textEmpty
    ? t('panel.criteria.problem.textEmpty')
    : textTooLong
      ? t('panel.criteria.problem.tooLong', { max: CRITERIA_LIMITS.textChars })
      : null

  const trimmedEvidence = criterion.evidence.trim()
  const evidenceEmpty = trimmedEvidence.length === 0
  const evidenceTooLong = trimmedEvidence.length > CRITERIA_LIMITS.evidenceChars
  const evidenceError = evidenceEmpty
    ? t('panel.criteria.problem.evidenceEmpty')
    : evidenceTooLong
      ? t('panel.criteria.problem.tooLong', { max: CRITERIA_LIMITS.evidenceChars })
      : null

  const hasServerTextError = serverFieldErrors.includes('text')
  const hasServerEvidenceError = serverFieldErrors.includes('evidence')
  const hasServerMethodError = serverFieldErrors.includes('check_method')
  const hasServerWeightError = serverFieldErrors.includes('weight')

  const isSaveAttempted = Boolean(
    saveAttempted || (criterion as { saveAttempted?: boolean }).saveAttempted,
  )

  const showTextError =
    Boolean(textError) && (textTouched || isSaveAttempted || hasServerTextError)
  const showEvidenceError =
    Boolean(evidenceError) &&
    (evidenceTouched || isSaveAttempted || hasServerEvidenceError)

  const handleWeightChange = (newWeight: CriteriaWeight) => {
    if (disabled || newWeight === criterion.weight) return
    // P1: changing to 'should'/'may' clears must_by_author.
    // Raising to 'must' starts with must_by_author = false.
    onChange({
      weight: newWeight,
      must_by_author: false,
    })
  }

  const handleCheckMethodChange = (newMethod: CriteriaCheckMethod) => {
    if (disabled || newMethod === criterion.check_method) return

    if (criterion.check_method === 'mandatory_points') {
      const hasNonEmptyPoints = criterion.mandatory_points?.some(
        (p) => p.text.trim().length > 0,
      )
      if (hasNonEmptyPoints) {
        setPendingMethod(newMethod)
        return
      }
    }

    if (newMethod === 'mandatory_points') {
      const currentPts = criterion.mandatory_points ?? []
      onChange({
        check_method: newMethod,
        mandatory_points: currentPts.length > 0 ? currentPts : [{ text: '' }],
      })
    } else {
      onChange({
        check_method: newMethod,
        mandatory_points: [],
      })
    }
  }

  const confirmMethodChange = () => {
    if (!pendingMethod) return
    onChange({
      check_method: pendingMethod,
      mandatory_points: [],
    })
    setPendingMethod(null)
  }

  const isProject = taskType === 'project'
  const removeAllConfirmLabel = t('panel.criteria.point.removeAllTitle').replace('?', '')

  return (
    <div className="card p-6 space-y-5">
      {/* Header with title and controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-dark/40 pb-3">
        <h4 className="font-semibold text-ink text-base">{title}</h4>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove('up')}
            aria-label={t('panel.criteria.moveCriterion', {
              id: criterion.id ?? String(index + 1),
              direction: 'up',
            })}
            title={t('panel.criteria.moveCriterion', {
              id: criterion.id ?? String(index + 1),
              direction: 'up',
            })}
            className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
          >
            <ArrowUp size={16} />
          </button>

          <button
            type="button"
            disabled={disabled || index === totalCount - 1}
            onClick={() => onMove('down')}
            aria-label={t('panel.criteria.moveCriterion', {
              id: criterion.id ?? String(index + 1),
              direction: 'down',
            })}
            title={t('panel.criteria.moveCriterion', {
              id: criterion.id ?? String(index + 1),
              direction: 'down',
            })}
            className="p-1.5 text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
          >
            <ArrowDown size={16} />
          </button>

          <button
            type="button"
            disabled={disabled || totalCount <= CRITERIA_LIMITS.minCriteria}
            onClick={onRemove}
            aria-label={t('panel.criteria.removeCriterion', {
              id: criterion.id ?? String(index + 1),
            })}
            title={
              totalCount <= CRITERIA_LIMITS.minCriteria
                ? t('panel.criteria.problem.noCriteria')
                : t('panel.criteria.removeCriterion', {
                    id: criterion.id ?? String(index + 1),
                  })
            }
            className="p-1.5 text-ink-muted hover:text-coral disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 ml-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Field: What to check */}
      <div className="space-y-1">
        <label
          htmlFor={`criterion-${index}-text`}
          className="block text-xs font-semibold text-ink-muted uppercase tracking-wider"
        >
          {t('panel.criteria.field.text')}
        </label>
        <textarea
          id={`criterion-${index}-text`}
          rows={3}
          disabled={disabled}
          value={criterion.text}
          onBlur={() => setTextTouched(true)}
          onChange={(e) => {
            setTextTouched(true)
            onChange({ text: e.target.value })
          }}
          aria-invalid={showTextError || hasServerTextError ? true : undefined}
          className={clsx(
            'w-full text-sm bg-canvas border rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
            showTextError || hasServerTextError ? 'border-coral' : 'border-canvas-dark',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        />
        {showTextError && <p className="text-xs text-coral">{textError}</p>}
      </div>

      {/* Field: Evidence of completion */}
      <div className="space-y-1">
        <label
          htmlFor={`criterion-${index}-evidence`}
          className="block text-xs font-semibold text-ink-muted uppercase tracking-wider"
        >
          {t('panel.criteria.field.evidence')}
        </label>
        <textarea
          id={`criterion-${index}-evidence`}
          rows={3}
          disabled={disabled}
          value={criterion.evidence}
          onBlur={() => setEvidenceTouched(true)}
          onChange={(e) => {
            setEvidenceTouched(true)
            onChange({ evidence: e.target.value })
          }}
          aria-invalid={showEvidenceError || hasServerEvidenceError ? true : undefined}
          className={clsx(
            'w-full text-sm bg-canvas border rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
            showEvidenceError || hasServerEvidenceError ? 'border-coral' : 'border-canvas-dark',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        />
        {showEvidenceError && <p className="text-xs text-coral">{evidenceError}</p>}
      </div>

      {/* Field: Weight */}
      <div className="space-y-2">
        <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {t('panel.criteria.field.weight')}
        </span>
        <div
          className={clsx(
            'inline-flex rounded-lg p-1 bg-canvas-dark/60 gap-1 border',
            hasServerWeightError ? 'border-coral' : 'border-transparent',
          )}
          role="radiogroup"
          aria-label={t('panel.criteria.field.weight')}
        >
          {WEIGHTS.map((w) => {
            const isSelected = criterion.weight === w
            const labelKey =
              w === 'must'
                ? 'panel.criteria.weight.must'
                : w === 'should'
                  ? 'panel.criteria.weight.should'
                  : 'panel.criteria.weight.may'

            return (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => handleWeightChange(w)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  isSelected
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                  disabled && 'opacity-60 cursor-not-allowed',
                )}
              >
                {t(labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Field: Mandatory for passing switch (only visible when weight is must) */}
      {criterion.weight === 'must' && (
        <div className="pt-1">
          <MandatorySwitch
            id={`criterion-${index}-mandatory`}
            checked={criterion.must_by_author === true}
            onChange={(checked) => onChange({ must_by_author: checked })}
            disabled={disabled}
          />
        </div>
      )}

      {/* Field: Check Method */}
      <div className="space-y-1">
        <label
          htmlFor={`criterion-${index}-method`}
          className="block text-xs font-semibold text-ink-muted uppercase tracking-wider"
        >
          {t('panel.criteria.field.checkMethod')}
        </label>
        <select
          id={`criterion-${index}-method`}
          disabled={disabled}
          value={criterion.check_method}
          onChange={(e) => handleCheckMethodChange(e.target.value as CriteriaCheckMethod)}
          aria-invalid={hasServerMethodError ? true : undefined}
          className={clsx(
            'w-full text-sm bg-canvas border rounded-lg px-3 py-2 text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
            hasServerMethodError ? 'border-coral' : 'border-canvas-dark',
            disabled && 'opacity-60 cursor-not-allowed',
          )}
        >
          <option value="model_verdict">
            {t('panel.criteria.method.modelVerdict')}
          </option>
          <option value="mandatory_points">
            {t('panel.criteria.method.mandatoryPoints')}
          </option>
          {isProject && (
            <option value="code_test">
              {t('panel.criteria.method.codeTest')}
            </option>
          )}
        </select>
      </div>

      {/* Field: Mandatory Points (only visible when check_method is mandatory_points) */}
      {criterion.check_method === 'mandatory_points' && (
        <div className="pt-1 border-t border-canvas-dark/30">
          <PointsField
            points={criterion.mandatory_points ?? []}
            onChange={(pts) => onChange({ mandatory_points: pts })}
            disabled={disabled}
          />
        </div>
      )}

      {/* Field: Concepts */}
      <div className="pt-1 border-t border-canvas-dark/30">
        <ConceptsPicker
          availableConcepts={availableConcepts}
          selectedConcepts={criterion.concepts ?? []}
          onChange={(concepts) => onChange({ concepts })}
          disabled={disabled}
        />
      </div>

      {/* Confirm dialog for clearing points when switching away from mandatory_points */}
      <ConfirmDialog
        open={pendingMethod !== null}
        title={t('panel.criteria.point.removeAllTitle')}
        cancelLabel={t('panel.criteria.cancel')}
        confirmLabel={removeAllConfirmLabel}
        confirmClass="btn-danger"
        onCancel={() => setPendingMethod(null)}
        onConfirm={confirmMethodChange}
      >
        <p>{t('panel.criteria.point.removeAllText')}</p>
      </ConfirmDialog>
    </div>
  )
}
