import type { ReactNode } from 'react'
import { DEFAULT_LANGUAGE, type Language } from './languages'
import { LanguageContext } from './LanguageContext'

/** The language of everything below. For now always the default one. */
export function LanguageProvider({
  language = DEFAULT_LANGUAGE,
  children,
}: {
  language?: Language
  children: ReactNode
}) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>
}
