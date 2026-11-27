/**
 * Language selector for courses (Task 2.4.13).
 *
 * Renders the cached whitelist served by ``GET /api/v1/config/languages``
 * (fetched once at app boot via ``utils/languages.ts``). When ``required``
 * is true, the "auto-detect" sentinel is removed and the selector
 * starts empty — the consumer (``DashboardPage``) blocks submit while
 * the value is "".
 *
 * Cold-cache: if the boot prefetch has not completed by the time the
 * select mounts, ``getCachedLanguages()`` returns null and we render
 * only the placeholder option (no list). Submit stays blocked because
 * the value stays "" — graceful degradation, no crash.
 */

import type { ChangeEvent } from 'react'
import {
  findLanguage,
  getCachedLanguages,
  languageDisplayName,
} from '../../utils/languages'
import { useLanguage, useT } from '../../i18n/LanguageContext'

interface Props {
  value: string | null
  onChange: (code: string | null) => void
  /** Label displayed above the select. */
  label?: string
  /** Label for the "no explicit choice" option. Ignored when ``required``. */
  autoLabel?: string
  /** When true, hides the auto-detect option and starts empty. */
  required?: boolean
  disabled?: boolean
  className?: string
}

export function LanguageSelect({
  value,
  onChange,
  label,
  autoLabel,
  required = false,
  disabled = false,
  className = '',
}: Props) {
  const language = useLanguage()
  const t = useT()
  const resolvedAutoLabel = autoLabel ?? t('panel.languageSelect.autoDetect')
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    onChange(v === '' ? null : v)
  }

  const languages = getCachedLanguages() ?? []

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-ink mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        className="input"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
      >
        {required ? (
          <option value="" disabled>
            {t('panel.languageSelect.chooseLanguage')}
          </option>
        ) : (
          <option value="">🔍 {resolvedAutoLabel}</option>
        )}
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {languageDisplayName(lang.code, language, lang.name_en)}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Compact read-only badge showing the language's localized name. */
export function LanguageBadge({ code }: { code: string | null | undefined }) {
  const language = useLanguage()
  const t = useT()
  const lang = findLanguage(code)
  if (!lang) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
        <span>🔍</span>
        <span>{t('panel.languageSelect.autoBadge')}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
      <span>{languageDisplayName(lang.code, language, lang.name_en)}</span>
    </span>
  )
}
