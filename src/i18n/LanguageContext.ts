import { createContext, useCallback, useContext } from 'react'
import { DEFAULT_LANGUAGE, type Language } from './languages'
import { translate, type MessageKey, type MessageValues } from './translate'

// The reader's language. Without a provider above — a component rendered on
// its own, in a test — it is the default language.
export const LanguageContext = createContext<Language>(DEFAULT_LANGUAGE)

export function useLanguage(): Language {
  return useContext(LanguageContext)
}

export type Translate = (key: MessageKey, values?: MessageValues) => string

/** `t(key, values?)` in the reader's language. */
export function useT(): Translate {
  const language = useLanguage()
  return useCallback(
    (key: MessageKey, values?: MessageValues) => translate(language, key, values),
    [language],
  )
}
