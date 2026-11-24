import { DEFAULT_LANGUAGE, type Language } from './languages'
import { registerCatalog, type Catalog } from './translate'

const loaded = new Set<Language>([DEFAULT_LANGUAGE])
let enPending: Promise<void> | null = null

/** Whether `language` already has its panel catalog registered. */
export function isPanelLanguageReady(language: Language): boolean {
  return loaded.has(language)
}

/**
 * Load and register the author panel catalog for `language` on demand.
 * Ukrainian is built into `translate.ts`; English is imported dynamically so
 * the portal bundle never pulls it in.
 */
export function loadPanelLanguage(language: Language): Promise<void> {
  if (loaded.has(language)) return Promise.resolve()
  if (language !== 'en') return Promise.resolve()
  if (enPending === null) {
    enPending = import('./catalogs/en/panel.json')
      .then((mod) => {
        registerCatalog('en', mod.default as Partial<Catalog>)
        loaded.add('en')
      })
      .finally(() => {
        enPending = null
      })
  }
  return enPending
}
