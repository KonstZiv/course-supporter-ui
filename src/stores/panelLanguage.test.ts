import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../privacy/surface'
import { useAuthStore } from './auth'
import {
  choosePanelLanguage,
  syncServerPanelLanguage,
  usePanelLanguage,
} from './panelLanguage'

const LANGUAGE_PATH = '/api/v1/author/interface-language'

interface Reply {
  status: number
  body?: unknown
}

function stubFetch(replies: Record<string, Reply | (() => Promise<Reply>)>) {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const path = new URL(url, 'http://x').pathname
    const entry = replies[path]
    const reply = typeof entry === 'function' ? await entry() : (entry ?? { status: 404 })
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: new Headers(),
      json: () => Promise.resolve(reply.body ?? { detail: 'Not Found' }),
      text: () => Promise.resolve(JSON.stringify(reply.body ?? { detail: 'Not Found' })),
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const putBodies = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls
    .filter(([url, init]) => new URL(url, 'http://x').pathname === LANGUAGE_PATH && init?.method === 'PUT')
    .map(([, init]) => JSON.parse(init?.body as string) as unknown)

const getCalls = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.filter(
    ([url, init]) =>
      new URL(url, 'http://x').pathname === LANGUAGE_PATH &&
      (!init?.method || init.method === 'GET'),
  )

const stored = () => localStorage.getItem(STORAGE_KEYS.panelLanguage)
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ apiKey: null, connected: false })
  usePanelLanguage.setState({ language: 'uk', desired: 'uk', picked: false, syncedKey: null })
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA'])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('panelLanguage — order of sources and initial boot', () => {
  it('resolves browser storage > navigator.languages > uk', async () => {
    const loadFresh = async (expected: 'uk' | 'en') => {
      vi.resetModules()
      const fresh = await import('./panelLanguage')
      await vi.waitFor(() => {
        expect(fresh.usePanelLanguage.getState().language).toBe(expected)
      })
      return fresh.usePanelLanguage.getState().language
    }

    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE'])
    expect(await loadFresh('uk')).toBe('uk')

    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE', 'en-US'])
    expect(await loadFresh('en')).toBe('en')

    localStorage.setItem(STORAGE_KEYS.panelLanguage, 'uk')
    expect(await loadFresh('uk')).toBe('uk')
  })

  it('keeps the previous language while the English catalog is still loading', async () => {
    vi.resetModules()
    let finishLoad!: () => void
    let loaded = false
    vi.doMock('../i18n/panelCatalogs', () => ({
      isPanelLanguageReady: (lang: string) => (lang === 'uk' ? true : loaded),
      loadPanelLanguage: () =>
        new Promise<void>((resolve) => {
          finishLoad = () => {
            loaded = true
            resolve()
          }
        }),
    }))

    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA'])
    const fresh = await import('./panelLanguage')
    expect(fresh.usePanelLanguage.getState().language).toBe('uk')

    fresh.choosePanelLanguage('en')
    // Before dynamic import settles, page stays in the previous language.
    expect(fresh.usePanelLanguage.getState().language).toBe('uk')
    expect(stored()).toBe('en')

    finishLoad()
    await flush()
    expect(fresh.usePanelLanguage.getState().language).toBe('en')
    vi.doUnmock('../i18n/panelCatalogs')
  })

  it('does not switch to en if the author switches back to uk while en is loading', async () => {
    vi.resetModules()
    let finishLoad!: () => void
    let loaded = false
    vi.doMock('../i18n/panelCatalogs', () => ({
      isPanelLanguageReady: (lang: string) => (lang === 'uk' ? true : loaded),
      loadPanelLanguage: () =>
        new Promise<void>((resolve) => {
          finishLoad = () => {
            loaded = true
            resolve()
          }
        }),
    }))

    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA'])
    const fresh = await import('./panelLanguage')
    fresh.choosePanelLanguage('en')
    expect(fresh.usePanelLanguage.getState().language).toBe('uk')

    fresh.choosePanelLanguage('uk')
    finishLoad()
    await flush()
    expect(fresh.usePanelLanguage.getState().language).toBe('uk')
    vi.doUnmock('../i18n/panelCatalogs')
  })
})

describe('panelLanguage — switcher and server persistence', () => {
  it('before sign-in: keeps choice in browser without calling the server', async () => {
    const fetchMock = stubFetch({})
    choosePanelLanguage('en')
    await flush()
    expect(usePanelLanguage.getState().language).toBe('en')
    expect(stored()).toBe('en')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('when signed in: sends PUT with ISO 639-3 code', async () => {
    const fetchMock = stubFetch({
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'eng' } },
    })
    useAuthStore.setState({ apiKey: 'key-1' })

    choosePanelLanguage('en')
    await flush()

    expect(usePanelLanguage.getState().language).toBe('en')
    expect(stored()).toBe('en')
    expect(putBodies(fetchMock)).toEqual([{ language: 'eng' }])
  })

  it('when PUT returns 404: keeps choice in browser, no error logged, stays signed in', async () => {
    stubFetch({ [LANGUAGE_PATH]: { status: 404 } })
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error')
    const warn = vi.spyOn(console, 'warn')
    useAuthStore.setState({ apiKey: 'key-1' })

    choosePanelLanguage('en')
    await flush()

    expect(usePanelLanguage.getState().language).toBe('en')
    expect(stored()).toBe('en')
    expect(useAuthStore.getState().apiKey).toBe('key-1')
    expect(debug).toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('on sign-in / startup: GET applies server language once, or leaves as-is on null/404', async () => {
    const fetchMock = stubFetch({
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'eng' } },
    })
    useAuthStore.setState({ apiKey: 'key-1' })

    syncServerPanelLanguage('key-1')
    syncServerPanelLanguage('key-1')
    await flush()
    await flush()

    expect(getCalls(fetchMock)).toHaveLength(1)
    expect(usePanelLanguage.getState().language).toBe('en')
    expect(stored()).toBe('en')

    // Server choice ('ukr') also overrides an older browser storage choice ('en') when !picked.
    usePanelLanguage.setState({ syncedKey: null })
    stubFetch({
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'ukr' } },
    })
    syncServerPanelLanguage('key-1')
    await flush()
    expect(usePanelLanguage.getState().language).toBe('uk')
    expect(stored()).toBe('uk')
  })

  it('switcher choice beats server response when picked before or during GET', async () => {
    let answer!: (reply: Reply) => void
    stubFetch({
      [LANGUAGE_PATH]: () => new Promise<Reply>((resolve) => { answer = resolve }),
    })
    useAuthStore.setState({ apiKey: 'key-1' })

    syncServerPanelLanguage('key-1')
    choosePanelLanguage('uk')
    answer({ status: 200, body: { interface_language: 'eng' } })
    await flush()
    await flush()

    expect(usePanelLanguage.getState().language).toBe('uk')
  })

  it('GET returning null or 404 leaves existing browser/default choice untouched', async () => {
    localStorage.setItem(STORAGE_KEYS.panelLanguage, 'en')
    usePanelLanguage.setState({ language: 'en', desired: 'en', picked: false, syncedKey: null })
    stubFetch({ [LANGUAGE_PATH]: { status: 200, body: { interface_language: null } } })
    useAuthStore.setState({ apiKey: 'key-1' })

    syncServerPanelLanguage('key-1')
    await flush()

    expect(usePanelLanguage.getState().language).toBe('en')
    expect(stored()).toBe('en')

    usePanelLanguage.setState({ syncedKey: null })
    stubFetch({ [LANGUAGE_PATH]: { status: 404 } })
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error')
    syncServerPanelLanguage('key-1')
    await flush()

    expect(usePanelLanguage.getState().language).toBe('en')
    expect(useAuthStore.getState().apiKey).toBe('key-1')
    expect(debug).toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('logout does not erase the browser language choice and allows next sign-in sync', async () => {
    stubFetch({
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'eng' } },
    })
    useAuthStore.getState().setApiKey('key-1')
    choosePanelLanguage('en')
    await flush()

    useAuthStore.getState().logout()
    expect(stored()).toBe('en')
    expect(usePanelLanguage.getState().language).toBe('en')
    expect(usePanelLanguage.getState().picked).toBe(false)
    expect(usePanelLanguage.getState().syncedKey).toBeNull()

    stubFetch({
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'ukr' } },
    })
    useAuthStore.getState().setApiKey('key-2')
    syncServerPanelLanguage('key-2')
    await flush()

    expect(usePanelLanguage.getState().language).toBe('uk')
    expect(stored()).toBe('uk')
  })
})
