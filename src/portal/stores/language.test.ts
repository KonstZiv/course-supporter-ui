import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applySignInLanguage,
  chooseLanguage,
  syncServerLanguage,
  takeLanguageFromAddress,
  usePortalLanguage,
} from './language'
import { usePortalSession } from './session'
import { STORAGE_KEYS } from '../../privacy/surface'

// Г-1 §4: a choice is kept in the browser before sign-in, and in the
// student's account after it. The real client runs; only `fetch` is stubbed.

const PUT_PATH = '/api/v1/portal/me/interface-language'
const ME_PATH = '/api/v1/portal/me'

interface Reply {
  status: number
  body?: unknown
}

/** A `fetch` that answers by path; a function reply may reject (no network). */
function stubFetch(replies: Record<string, Reply | (() => Promise<Reply>)>) {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const path = new URL(url, 'http://x').pathname
    const entry = replies[path]
    const reply = typeof entry === 'function' ? await entry() : (entry ?? { status: 404 })
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      json: () => Promise.resolve(reply.body ?? { detail: 'Not Found' }),
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof stubFetch>, path: string) =>
  fetchMock.mock.calls.filter(([url]) => new URL(url, 'http://x').pathname === path)

const putBodies = (fetchMock: ReturnType<typeof stubFetch>) =>
  callsTo(fetchMock, PUT_PATH).map(([, init]) => {
    expect(init?.method).toBe('PUT')
    return JSON.parse(init?.body as string) as unknown
  })

const stored = () => localStorage.getItem(STORAGE_KEYS.portalLanguage)
const language = () => usePortalLanguage.getState().language
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function signIn(token = 'jwt') {
  usePortalSession.getState().setSession({
    token,
    tenantId: 't',
    studentId: 's',
    displayName: null,
  })
}

const me = (interfaceLanguage?: string | null) => ({
  student_id: 's',
  tenant_id: 't',
  login: 'olena',
  display_name: null,
  recovery_email: null,
  recovery_email_confirmed: false,
  preferred_language: null,
  ...(interfaceLanguage === undefined ? {} : { interface_language: interfaceLanguage }),
})

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  usePortalLanguage.setState({ language: 'uk', picked: false, syncedToken: null })
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA'])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the switcher', () => {
  it('before sign-in: shown at once, kept in the browser, nothing sent', () => {
    const fetchMock = stubFetch({})
    chooseLanguage('en')
    expect(language()).toBe('en')
    expect(stored()).toBe('en')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('after sign-in: shown at once, then PUT to the account', async () => {
    const fetchMock = stubFetch({ [PUT_PATH]: { status: 200, body: { interface_language: 'eng' } } })
    signIn()
    chooseLanguage('en')
    expect(language()).toBe('en')
    expect(stored()).toBe('en')
    await flush()
    expect(putBodies(fetchMock)).toEqual([{ language: 'en' }])
  })

  it('a server without the endpoint (404): the choice stays, nothing louder than debug', async () => {
    stubFetch({})
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error')
    const warn = vi.spyOn(console, 'warn')
    signIn()
    chooseLanguage('en')
    await flush()
    expect(language()).toBe('en')
    expect(stored()).toBe('en')
    expect(debug).toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })

  it('no network: the choice stays, nothing louder than debug', async () => {
    stubFetch({ [PUT_PATH]: () => Promise.reject(new TypeError('Failed to fetch')) })
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error')
    signIn()
    chooseLanguage('en')
    await flush()
    expect(language()).toBe('en')
    expect(debug).toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })

  it('signing out keeps the choice in the browser', () => {
    stubFetch({ [PUT_PATH]: { status: 200, body: { interface_language: 'eng' } } })
    signIn()
    chooseLanguage('en')
    usePortalSession.getState().clear()
    expect(stored()).toBe('en')
  })
})

describe('the sign-in', () => {
  it('a language kept in the account is shown at once; nothing is sent', async () => {
    const fetchMock = stubFetch({})
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'uk')
    signIn()
    applySignInLanguage('jwt', 'eng')
    expect(language()).toBe('en')
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('nothing kept in the account, a choice in the browser: PUT that choice', async () => {
    const fetchMock = stubFetch({ [PUT_PATH]: { status: 200, body: { interface_language: 'eng' } } })
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'en')
    signIn()
    applySignInLanguage('jwt', null)
    expect(language()).toBe('en')
    await flush()
    expect(putBodies(fetchMock)).toEqual([{ language: 'en' }])
  })

  it('nothing kept anywhere: no PUT — the browser language and the default are not written', async () => {
    const fetchMock = stubFetch({})
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    signIn()
    applySignInLanguage('jwt', null)
    expect(language()).toBe('en')
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('an answer without the field reads as null', async () => {
    const fetchMock = stubFetch({})
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'en')
    signIn()
    applySignInLanguage('jwt', undefined)
    expect(language()).toBe('en')
    await flush()
    // The older server has no PUT either: 404, swallowed.
    expect(callsTo(fetchMock, PUT_PATH)).toHaveLength(1)
    expect(debug).toHaveBeenCalled()
  })

  it('a kept language the portal does not speak: the order goes on, nothing is overwritten', async () => {
    const fetchMock = stubFetch({})
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'en')
    signIn()
    applySignInLanguage('jwt', 'deu')
    expect(language()).toBe('en')
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a choice made on the sign-in page gives way to the one kept in the account', () => {
    stubFetch({})
    chooseLanguage('en')
    signIn()
    applySignInLanguage('jwt', 'ukr')
    expect(language()).toBe('uk')
  })
})

describe('a session the portal opened with', () => {
  it('reads the account language once per session, from /portal/me', async () => {
    const fetchMock = stubFetch({ [ME_PATH]: { status: 200, body: me('eng') } })
    signIn()
    syncServerLanguage('jwt')
    syncServerLanguage('jwt')
    await flush()
    expect(language()).toBe('en')
    expect(callsTo(fetchMock, ME_PATH)).toHaveLength(1)
    expect(callsTo(fetchMock, PUT_PATH)).toHaveLength(0)
  })

  it('a choice made while /portal/me is on its way wins', async () => {
    let answer: (reply: Reply) => void = () => undefined
    stubFetch({
      [ME_PATH]: () => new Promise<Reply>((resolve) => (answer = resolve)),
      [PUT_PATH]: { status: 200, body: { interface_language: 'ukr' } },
    })
    signIn()
    syncServerLanguage('jwt')
    chooseLanguage('uk')
    answer({ status: 200, body: me('eng') })
    await flush()
    await flush()
    expect(language()).toBe('uk')
  })

  it('an older server without the field: the language stays as it was', async () => {
    stubFetch({ [ME_PATH]: { status: 200, body: me() } })
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'en')
    usePortalLanguage.setState({ language: 'en' })
    signIn()
    syncServerLanguage('jwt')
    await flush()
    expect(language()).toBe('en')
  })
})

describe('?lang= in the address', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('is kept as the browser choice, shown, and leaves the address — the rest stays', () => {
    window.history.replaceState(null, '', '/t/login?next=%2Ft%2Fhome&lang=en&x=1#top')
    takeLanguageFromAddress()
    expect(language()).toBe('en')
    expect(stored()).toBe('en')
    expect(window.location.pathname).toBe('/t/login')
    expect(window.location.search).toBe('?next=%2Ft%2Fhome&x=1')
    expect(window.location.hash).toBe('#top')
  })

  it('a language the portal does not speak leaves the address, and nothing is kept', () => {
    window.history.replaceState(null, '', '/t/login?lang=de')
    takeLanguageFromAddress()
    expect(language()).toBe('uk')
    expect(stored()).toBeNull()
    expect(window.location.search).toBe('')
  })

  it('an address without it is left alone', () => {
    window.history.replaceState(null, '', '/t/login?next=%2Fa')
    takeLanguageFromAddress()
    expect(window.location.search).toBe('?next=%2Fa')
  })
})

describe('the first language, before anything is chosen', () => {
  it('is the stored choice, else the browser language, else Ukrainian', async () => {
    const load = async () => {
      vi.resetModules()
      const fresh = await import('./language')
      return fresh.usePortalLanguage.getState().language
    }
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE'])
    expect(await load()).toBe('uk')
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE', 'en-US'])
    expect(await load()).toBe('en')
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'uk')
    expect(await load()).toBe('uk')
  })
})
