import { clsx } from 'clsx'
import { useT } from '../../i18n/LanguageContext'
import { CRITERIA_LIMITS } from '../../utils/criteriaRules'

export interface ConceptsPickerProps {
  availableConcepts: string[]
  selectedConcepts: string[]
  onChange: (concepts: string[]) => void
  disabled?: boolean
  error?: string | null
}

/**
 * Concepts chip-picker from section/course main concepts (spec 3.К7).
 * Up to 10 concepts; no free-form text input.
 */
export function ConceptsPicker({
  availableConcepts,
  selectedConcepts,
  onChange,
  disabled = false,
  error = null,
}: ConceptsPickerProps) {
  const t = useT()

  const handleToggle = (concept: string) => {
    if (disabled) return
    const isSelected = selectedConcepts.includes(concept)
    if (isSelected) {
      onChange(selectedConcepts.filter((c) => c !== concept))
    } else {
      if (selectedConcepts.length < CRITERIA_LIMITS.maxConcepts) {
        onChange([...selectedConcepts, concept])
      }
    }
  }

  if (availableConcepts.length === 0) {
    return (
      <div className="space-y-1">
        <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {t('panel.criteria.field.concepts')}
        </span>
        <p className="text-xs text-ink-muted italic">
          {t('panel.criteria.concepts.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {t('panel.criteria.field.concepts')}
        </span>
        <span className="text-xs text-ink-muted">
          {t('panel.criteria.concepts.hint', { max: CRITERIA_LIMITS.maxConcepts })}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('panel.criteria.field.concepts')}>
        {availableConcepts.map((concept) => {
          const isSelected = selectedConcepts.includes(concept)
          const atLimit = !isSelected && selectedConcepts.length >= CRITERIA_LIMITS.maxConcepts

          return (
            <button
              key={concept}
              type="button"
              disabled={disabled || atLimit}
              onClick={() => handleToggle(concept)}
              aria-pressed={isSelected}
              title={
                atLimit
                  ? t('panel.criteria.problem.tooManyConcepts', {
                      max: CRITERIA_LIMITS.maxConcepts,
                    })
                  : undefined
              }
              className={clsx(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                isSelected
                  ? 'bg-navy text-white border-navy'
                  : 'bg-canvas-dark/60 text-ink border-transparent hover:bg-canvas-dark',
                (disabled || atLimit) && 'opacity-50 cursor-not-allowed',
              )}
            >
              {concept}
            </button>
          )
        })}
      </div>

      {selectedConcepts.length >= CRITERIA_LIMITS.maxConcepts && (
        <p className="text-xs text-ink-muted">
          {t('panel.criteria.problem.tooManyConcepts', {
            max: CRITERIA_LIMITS.maxConcepts,
          })}
        </p>
      )}

      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  )
}
