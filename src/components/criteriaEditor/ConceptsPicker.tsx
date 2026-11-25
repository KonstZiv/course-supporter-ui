import { useState } from 'react'
import { clsx } from 'clsx'
import { Plus } from 'lucide-react'
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
 * Up to 10 concepts; collapsed by default, expandable search/picker.
 */
export function ConceptsPicker({
  availableConcepts,
  selectedConcepts,
  onChange,
  disabled = false,
  error = null,
}: ConceptsPickerProps) {
  const t = useT()
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleAdd = (concept: string) => {
    if (disabled || selectedConcepts.length >= CRITERIA_LIMITS.maxConcepts) return
    if (!selectedConcepts.includes(concept)) {
      onChange([...selectedConcepts, concept])
    }
  }

  const handleRemove = (concept: string) => {
    if (disabled) return
    onChange(selectedConcepts.filter((c) => c !== concept))
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

  const unselectedConcepts = availableConcepts.filter(
    (c) => !selectedConcepts.includes(c),
  )

  const query = searchQuery.trim().toLowerCase()
  const filteredUnselected = query
    ? unselectedConcepts.filter((c) => c.toLowerCase().includes(query))
    : unselectedConcepts

  const atLimit = selectedConcepts.length >= CRITERIA_LIMITS.maxConcepts

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

      {/* Selected concepts chips or none message */}
      {selectedConcepts.length === 0 ? (
        <p className="text-xs text-ink-muted italic">
          {t('panel.criteria.concepts.none')}
        </p>
      ) : (
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label={t('panel.criteria.field.concepts')}
        >
          {selectedConcepts.map((concept) => (
            <span
              key={concept}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-navy text-white"
            >
              <span>{concept}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemove(concept)}
                aria-label={`\u00D7 ${concept}`}
                title={`\u00D7 ${concept}`}
                className="hover:bg-white/20 rounded-full w-4 h-4 inline-flex items-center justify-center text-xs leading-none transition-colors focus:outline-none"
              >
                {'\u00D7'}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add concept button (collapsed state) */}
      {!isExpanded ? (
        <div>
          <button
            type="button"
            disabled={disabled || atLimit}
            onClick={() => setIsExpanded(true)}
            className={clsx(
              'btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5',
              (disabled || atLimit) && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Plus size={14} />
            {t('panel.criteria.concepts.add')}
          </button>
        </div>
      ) : (
        /* Expanded block: search, unselected concepts, collapse button */
        <div className="space-y-2 p-3 rounded-lg border border-canvas-dark/60 bg-canvas-dark/20">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('panel.criteria.concepts.search')}
              aria-label={t('panel.criteria.concepts.search')}
              className="flex-1 text-xs bg-canvas border border-canvas-dark rounded-lg px-2.5 py-1.5 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
            />
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false)
                setSearchQuery('')
              }}
              className="btn-secondary text-xs px-3 py-1.5 shrink-0"
            >
              {t('panel.criteria.concepts.collapse')}
            </button>
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={t('panel.criteria.field.concepts')}
          >
            {filteredUnselected.map((concept) => (
              <button
                key={concept}
                type="button"
                disabled={disabled || atLimit}
                onClick={() => handleAdd(concept)}
                className={clsx(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  'bg-canvas-dark/60 text-ink border-transparent hover:bg-canvas-dark',
                  (disabled || atLimit) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {concept}
              </button>
            ))}
          </div>
        </div>
      )}

      {atLimit && (
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
