import { clsx } from 'clsx'
import { useT } from '../../i18n/LanguageContext'

export interface MandatorySwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

/**
 * Switch to mark a must-weight criterion as mandatory for passing (spec 3.К7, 6.П1-П2).
 * Visible only when weight is 'must'.
 */
export function MandatorySwitch({
  checked,
  onChange,
  disabled = false,
  id,
}: MandatorySwitchProps) {
  const t = useT()

  return (
    <label
      htmlFor={id}
      className={clsx(
        'inline-flex items-start gap-3 select-none',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={t('panel.criteria.mark.makeMandatory')}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 mt-0.5',
          checked ? 'bg-navy' : 'bg-canvas-dark',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink">
          {t('panel.criteria.mark.makeMandatory')}
        </span>
        <span className="text-xs text-ink-muted">
          {t('panel.criteria.mark.switchHint')}
        </span>
      </div>
    </label>
  )
}
