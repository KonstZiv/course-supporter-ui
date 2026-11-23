import { clsx } from 'clsx'
import { Plus, Trash2 } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'
import { CRITERIA_LIMITS } from '../../utils/criteriaRules'

export interface MandatoryPointItem {
  id?: string | null
  text: string
}

export interface PointsFieldProps {
  points: MandatoryPointItem[]
  onChange: (points: MandatoryPointItem[]) => void
  disabled?: boolean
  error?: string | null
}

/**
 * Mandatory points editor for criteria with 'mandatory_points' check method (spec 3.К7).
 * 1-10 points, 1-300 characters each.
 */
export function PointsField({
  points,
  onChange,
  disabled = false,
  error = null,
}: PointsFieldProps) {
  const t = useT()

  const handleTextChange = (index: number, newText: string) => {
    const updated = points.map((p, i) => (i === index ? { ...p, text: newText } : p))
    onChange(updated)
  }

  const handleAdd = () => {
    if (disabled || points.length >= CRITERIA_LIMITS.maxPoints) return
    onChange([...points, { text: '' }])
  }

  const handleRemove = (index: number) => {
    if (disabled) return
    onChange(points.filter((_, i) => i !== index))
  }

  const atMaxPoints = points.length >= CRITERIA_LIMITS.maxPoints

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {t('panel.criteria.field.points')}
        </span>
      </div>

      {points.length === 0 && (
        <p className="text-xs text-coral">
          {t('panel.criteria.problem.noPoints')}
        </p>
      )}

      <div className="space-y-2">
        {points.map((pt, idx) => {
          const trimmed = pt.text.trim()
          const isEmpty = trimmed.length === 0
          const isTooLong = trimmed.length > CRITERIA_LIMITS.pointChars
          const pointError = isEmpty
            ? t('panel.criteria.problem.pointEmpty')
            : isTooLong
              ? t('panel.criteria.problem.tooLong', { max: CRITERIA_LIMITS.pointChars })
              : null

          return (
            <div key={pt.id ?? idx} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-ink-muted w-5 shrink-0 text-right">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={pt.text}
                  disabled={disabled}
                  placeholder={t('panel.criteria.point.placeholder')}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                  aria-label={t('panel.criteria.point.placeholder')}
                  aria-invalid={pointError ? true : undefined}
                  className={clsx(
                    'flex-1 text-sm bg-canvas border rounded-lg px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
                    pointError ? 'border-coral' : 'border-canvas-dark',
                    disabled && 'opacity-60 cursor-not-allowed',
                  )}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemove(idx)}
                  aria-label={t('panel.criteria.point.remove', { number: idx + 1 })}
                  title={t('panel.criteria.point.remove', { number: idx + 1 })}
                  className="p-2 text-ink-muted hover:text-coral rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {pointError && (
                <p className="text-xs text-coral pl-7">{pointError}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          disabled={disabled || atMaxPoints}
          onClick={handleAdd}
          title={
            atMaxPoints
              ? t('panel.criteria.problem.tooManyPoints', { max: CRITERIA_LIMITS.maxPoints })
              : undefined
          }
          className={clsx(
            'btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5',
            (disabled || atMaxPoints) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Plus size={14} />
          {t('panel.criteria.point.add')}
        </button>
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  )
}
