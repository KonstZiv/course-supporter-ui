// The languages the portal can speak. A language is listed here before it has
// a catalog; `enabled` says whether a reader can be given it.

export type Language = 'uk' | 'en'

export interface LanguageInfo {
  code: Language
  /** The value of `<html lang>` for this language. */
  htmlLang: string
  /** The name of the language in that language — never translated. */
  nativeName: string
  /** The locale `Intl` formats numbers, dates and plurals with. */
  locale: string
  enabled: boolean
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'uk', htmlLang: 'uk', nativeName: 'Українська', locale: 'uk-UA', enabled: true },
  { code: 'en', htmlLang: 'en', nativeName: 'English', locale: 'en-GB', enabled: false },
]

export const DEFAULT_LANGUAGE: Language = 'uk'

export function languageInfo(language: Language): LanguageInfo {
  return LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]!
}

/** The `Intl` locale of a language: "uk-UA" for `uk`. */
export function localeOf(language: Language): string {
  return languageInfo(language).locale
}
