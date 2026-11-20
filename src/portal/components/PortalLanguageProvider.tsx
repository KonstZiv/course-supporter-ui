import { useEffect, type ReactNode } from 'react'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { languageInfo } from '../../i18n/languages'
import { usePortalLanguage } from '../stores/language'

/**
 * The portal's language for everything below, from the portal's language
 * store; the page's `<html lang>` follows it.
 */
export function PortalLanguageProvider({ children }: { children: ReactNode }) {
  const language = usePortalLanguage((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = languageInfo(language).htmlLang
  }, [language])
  return <LanguageProvider language={language}>{children}</LanguageProvider>
}
