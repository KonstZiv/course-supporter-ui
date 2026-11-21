// The languages the portal can speak. A language is listed here before it has
// a catalog; `enabled` says whether a reader can be given it. A new language
// is a catalog and one entry here — no code.

export type Language = 'uk' | 'en'

export interface LanguageInfo {
  code: Language
  /** The value of `<html lang>` for this language. */
  htmlLang: string
  /** The name of the language in that language — never translated. */
  nativeName: string
  /** The locale `Intl` formats numbers, dates and plurals with. */
  locale: string
  /** ISO 639-3: the code the server names the language by ("ukr"). */
  iso3: string
  enabled: boolean
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'uk', htmlLang: 'uk', nativeName: 'Українська', locale: 'uk-UA', iso3: 'ukr', enabled: true },
  { code: 'en', htmlLang: 'en', nativeName: 'English', locale: 'en-GB', iso3: 'eng', enabled: true },
]

export const DEFAULT_LANGUAGE: Language = 'uk'

export function languageInfo(language: Language): LanguageInfo {
  return LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0]!
}

/** The `Intl` locale of a language: "uk-UA" for `uk`. */
export function localeOf(language: Language): string {
  return languageInfo(language).locale
}

/** The languages a reader can be given, in the order of the list. */
export function enabledLanguages(): LanguageInfo[] {
  return LANGUAGES.filter((l) => l.enabled)
}

/** The ISO 639-3 code of a language: "ukr" for `uk`. */
export function iso3Of(language: Language): string {
  return languageInfo(language).iso3
}

/** The enabled language a server code ("eng") names, or null. */
export function languageFromIso3(code: string | null | undefined): Language | null {
  if (!code) return null
  const lower = code.toLowerCase()
  return enabledLanguages().find((l) => l.iso3 === lower)?.code ?? null
}

/**
 * The enabled language a code from an address or a browser names, or null:
 * "en", "en-GB", "uk_UA", and the server's three letters ("eng") as well.
 */
export function languageFromCode(code: string | null | undefined): Language | null {
  if (!code) return null
  const primary = code.trim().toLowerCase().split(/[-_]/)[0] ?? ''
  if (primary.length === 3) return languageFromIso3(primary)
  return enabledLanguages().find((l) => l.code === primary)?.code ?? null
}
