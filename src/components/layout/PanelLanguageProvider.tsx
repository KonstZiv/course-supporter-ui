import { useEffect, type ReactNode } from 'react'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { languageInfo } from '../../i18n/languages'
import { usePanelLanguage } from '../../stores/panelLanguage'

/**
 * The author panel's language for everything below, from the panel language
 * store; the page's `<html lang>` follows it.
 */
export function PanelLanguageProvider({ children }: { children: ReactNode }) {
  const language = usePanelLanguage((s) => s.language)
  useEffect(() => {
    document.documentElement.lang = languageInfo(language).htmlLang
  }, [language])
  return <LanguageProvider language={language}>{children}</LanguageProvider>
}
