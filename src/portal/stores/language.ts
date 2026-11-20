import { create } from 'zustand'
import { STORAGE_KEYS } from '../../privacy/surface'
import { languageFromCode, languageFromIso3, type Language } from '../../i18n/languages'
import { resolveLanguage } from '../languageChoice'
import { portalApi } from '../api/portalClient'
import { usePortalSession } from './session'

// The portal's language: one place, read by the portal's LanguageProvider and
// changed through `chooseLanguage` (`useSetLanguage` in components). The order
// of the sources is `resolveLanguage`'s. A choice is kept in this browser
// always, and — once the student is signed in — on the server, in the
// student's account (`interface_language`). A language taken from the
// account is kept in the browser too, so the sign-in page after signing out
// speaks the student's language. The server may not have that field yet: then
// the choice simply stays in the browser, and nothing on the page says
// otherwise.

const LANGUAGE_KEY = STORAGE_KEYS.portalLanguage

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

interface PortalLanguageState {
  language: Language
  /**
   * Chosen with the switcher during this visit of the page — before sign-in
   * or after it — and not since signing out: a fresh choice, which the
   * account's language does not override. A choice only stored in the
   * browser from an earlier visit is not one.
   */
  picked: boolean
  /** The session whose server choice is already known — read, or given by the sign-in. */
  syncedToken: string | null
}

export const usePortalLanguage = create<PortalLanguageState>(() => ({
  language: resolveLanguage({ stored: readStored(), browser: browserLanguages() }),
  picked: false,
  syncedToken: null,
}))

function saveOnServer(language: Language): void {
  portalApi.setInterfaceLanguage(language).catch((err: unknown) => {
    // A server without the field (404/405) or no network: the choice stays in
    // the browser. A 401 is the client's own business (sign-in again).
    console.debug('portal: interface language not saved on the server', err)
  })
}

/** The switcher's choice: shown at once, kept in the browser, and on the server when signed in. */
export function chooseLanguage(language: Language): void {
  usePortalLanguage.setState({ language, picked: true })
  writeStored(language)
  if (usePortalSession.getState().token !== null) saveOnServer(language)
}

/** The function components change the language with. */
export function useSetLanguage(): (language: Language) => void {
  return chooseLanguage
}

/**
 * The student just signed in; `server` is what their account keeps (the
 * sign-in answer's `interface_language`; absent on an older server — then
 * null). A fresh choice made with the switcher on this visit wins and goes to
 * the account, whatever is kept there. Else a language the portal speaks is
 * shown at once (and kept in the browser); with nothing kept there, the
 * choice stored in this browser goes to the account — a browser's own
 * language or the default one does not.
 */
export function applySignInLanguage(token: string, server: string | null | undefined): void {
  const { picked, language } = usePortalLanguage.getState()
  if (picked) {
    usePortalLanguage.setState({ syncedToken: token })
    if (languageFromIso3(server) !== language) saveOnServer(language)
    return
  }
  applyServerLanguage(token, server ?? null)
  if (server == null) {
    const choice = languageFromCode(readStored())
    if (choice !== null) saveOnServer(choice)
  }
}

function applyServerLanguage(token: string, server: string | null): void {
  usePortalLanguage.setState({ syncedToken: token })
  if (usePortalLanguage.getState().picked) return
  const fromServer = languageFromIso3(server)
  if (fromServer !== null) writeStored(fromServer)
  usePortalLanguage.setState({
    language: resolveLanguage({ server, stored: readStored(), browser: browserLanguages() }),
  })
}

/**
 * The server's choice for a session the portal opened with (a sign-in from
 * an earlier visit): read once per session, from `GET /portal/me`.
 */
export function syncServerLanguage(token: string): void {
  if (usePortalLanguage.getState().syncedToken === token) return
  usePortalLanguage.setState({ syncedToken: token })
  portalApi
    .me()
    .then((me) => {
      if (usePortalSession.getState().token !== token) return
      applyServerLanguage(token, me.interface_language ?? null)
    })
    .catch((err: unknown) => {
      console.debug('portal: interface language not read from the server', err)
    })
}

/**
 * `?lang=<code>` in the address the portal opened at: a language the portal
 * speaks is kept as this browser's choice and shown; the parameter leaves the
 * address bar either way, the rest of the address as it was.
 */
export function takeLanguageFromAddress(): void {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('lang')) return
  const query = url.searchParams.get('lang')
  url.searchParams.delete('lang')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  const language = languageFromCode(query)
  if (language === null) return
  writeStored(language)
  usePortalLanguage.setState({ language })
}

// Signing out ends the visit's fresh choice: the next sign-in, perhaps of
// another student, answers to that student's account. The language shown and
// the one stored in the browser stay as they are.
usePortalSession.subscribe((session, previous) => {
  if (previous.token !== null && session.token === null) {
    usePortalLanguage.setState({ picked: false, syncedToken: null })
  }
})
