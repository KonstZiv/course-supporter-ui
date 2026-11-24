import { create } from 'zustand'
import { STORAGE_KEYS } from '../privacy/surface'
import {
  DEFAULT_LANGUAGE,
  iso3Of,
  languageFromIso3,
  type Language,
} from '../i18n/languages'
import { isPanelLanguageReady, loadPanelLanguage } from '../i18n/panelCatalogs'
import { resolveLanguage } from '../portal/languageChoice'
import { authorSettingsApi } from '../api/authorSettings'
import { useAuthStore } from './auth'

// The author panel's language: one place, read by PanelLanguageProvider and
// changed through `choosePanelLanguage` (`useSetPanelLanguage` in components).
// Order of sources: `resolveLanguage` (switcher > server > browser storage >
// navigator.languages > default). Non-default panel catalogs load on demand so
// the page stays in the previous language until the catalog is registered.

const LANGUAGE_KEY = STORAGE_KEYS.panelLanguage

function readStored(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language)
  } catch {
    // A browser that keeps nothing still shows the chosen language now.
  }
}

function browserLanguages(): readonly string[] {
  return typeof navigator === 'undefined' ? [] : navigator.languages ?? []
}

interface PanelLanguageState {
  language: Language
  /** Target language requested; `language` follows once its catalog is ready. */
  desired: Language
  /**
   * Chosen with the switcher during this visit of the page (before or after
   * sign-in) and not since signing out: a fresh choice, which the server's
   * language does not override.
   */
  picked: boolean
  /** The API key whose server choice is already known (or being read). */
  syncedKey: string | null
}

const initialTarget = resolveLanguage({ stored: readStored(), browser: browserLanguages() })

export const usePanelLanguage = create<PanelLanguageState>(() => ({
  language: isPanelLanguageReady(initialTarget) ? initialTarget : DEFAULT_LANGUAGE,
  desired: initialTarget,
  picked: false,
  syncedKey: null,
}))

function applyLanguage(target: Language): void {
  usePanelLanguage.setState({ desired: target })
  if (isPanelLanguageReady(target)) {
    if (usePanelLanguage.getState().language !== target) {
      usePanelLanguage.setState({ language: target })
    }
    return
  }
  void loadPanelLanguage(target)
    .then(() => {
      if (usePanelLanguage.getState().desired === target) {
        usePanelLanguage.setState({ language: target })
      }
    })
    .catch((err: unknown) => {
      console.debug('panel: failed to load language catalog', err)
    })
}

if (!isPanelLanguageReady(initialTarget)) {
  applyLanguage(initialTarget)
}

function saveOnServer(language: Language): void {
  authorSettingsApi.setInterfaceLanguage(iso3Of(language)).catch((err: unknown) => {
    // A server without №724 (404) or no network: the choice stays in the
    // browser with no error message and no sign-out.
    console.debug('panel: interface language not saved on the server', err)
  })
}

/** The switcher's choice: kept in the browser, saved on the server when signed in, and shown once its catalog is ready. */
export function choosePanelLanguage(language: Language): void {
  usePanelLanguage.setState({ picked: true })
  writeStored(language)
  if (useAuthStore.getState().apiKey !== null) saveOnServer(language)
  applyLanguage(language)
}

/** The function components change the panel language with. */
export function useSetPanelLanguage(): (language: Language) => void {
  return choosePanelLanguage
}

/**
 * Read the server's choice once per API key (`GET /api/v1/author/interface-language`).
 * Applies it if there is a supported language and the author has not picked
 * one with the switcher during this visit.
 */
export function syncServerPanelLanguage(apiKey: string): void {
  if (usePanelLanguage.getState().syncedKey === apiKey) return
  usePanelLanguage.setState({ syncedKey: apiKey })
  authorSettingsApi
    .getInterfaceLanguage()
    .then((res) => {
      if (useAuthStore.getState().apiKey !== apiKey) return
      if (usePanelLanguage.getState().picked) return
      const fromServer = languageFromIso3(res.interface_language)
      if (fromServer !== null) writeStored(fromServer)
      applyLanguage(
        resolveLanguage({
          server: res.interface_language,
          stored: readStored(),
          browser: browserLanguages(),
        }),
      )
    })
    .catch((err: unknown) => {
      console.debug('panel: interface language not read from the server', err)
    })
}

// Signing out ends the visit's fresh choice: the next sign-in answers to the
// server's choice again. The language shown and the one stored in the browser
// stay as they are.
useAuthStore.subscribe((auth, previous) => {
  if (previous.apiKey !== null && auth.apiKey === null) {
    usePanelLanguage.setState({ picked: false, syncedKey: null })
  }
})
