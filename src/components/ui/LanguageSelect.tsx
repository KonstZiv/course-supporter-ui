/**
 * Language selector for courses and materials.
 *
 * Emits an ISO 639-1 code or `null` for "auto-detect / inherit".
 */

import type { ChangeEvent } from 'react'
import { LANGUAGES, findLanguage } from '../../utils/languages'

interface Props {
  value: string | null
  onChange: (code: string | null) => void
  /** Label displayed above the select. */
  label?: string
  /** Label for the "no explicit choice" option. */
  autoLabel?: string
  disabled?: boolean
  className?: string
}

export function LanguageSelect({
  value,
  onChange,
  label,
  autoLabel = 'Автовизначення',
  disabled = false,
  className = '',
}: Props) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    onChange(v === '' ? null : v)
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      )}
      <select
        className="input"
        value={value ?? ''}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value="">🔍 {autoLabel}</option>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Compact read-only badge showing language code with flag. */
export function LanguageBadge({ code }: { code: string | null | undefined }) {
  const lang = findLanguage(code)
  if (!lang) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
        <span>🔍</span>
        <span>авто</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
      <span>{lang.flag}</span>
      <span>{lang.label}</span>
    </span>
  )
}
