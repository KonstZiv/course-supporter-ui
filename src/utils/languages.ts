/** Language metadata and helpers — no React components here.
 *
 * Separated from LanguageSelect component so that fast-refresh works
 * cleanly (react-refresh requires component files to export only
 * components).
 */

export interface LanguageOption {
  code: string
  label: string
  flag: string
}

/** Common course languages. Keep synced with backend support expectations. */
export const LANGUAGES: LanguageOption[] = [
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
]

export function findLanguage(code: string | null | undefined): LanguageOption | null {
  if (!code) return null
  return LANGUAGES.find((l) => l.code === code) ?? null
}
