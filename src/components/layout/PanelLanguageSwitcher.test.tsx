import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

vi.mock('../../api/jobs', () => ({
  jobsApi: {
    history: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    get: vi.fn(),
  },
}))
vi.mock('../../utils/languages', () => ({
  getLanguages: vi.fn().mockResolvedValue([]),
  getCachedLanguages: vi.fn().mockReturnValue(null),
  findLanguage: vi.fn().mockReturnValue(null),
}))
vi.mock('../../pages/DashboardPage', () => ({
  DashboardPage: () => <h1>page: courses</h1>,
}))

import App from '../../App'
import { STORAGE_KEYS } from '../../privacy/surface'
import { useAuthStore } from '../../stores/auth'
import { usePanelLanguage } from '../../stores/panelLanguage'
import { PanelLanguageProvider } from './PanelLanguageProvider'

const LANGUAGE_PATH = '/api/v1/author/interface-language'
const NODES_PATH = '/api/v1/nodes'

interface Reply {
  status: number
  body?: unknown
}

function stubFetch(replies: Record<string, Reply>) {
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const path = new URL(url, 'http://x').pathname
    const reply = replies[path] ?? { status: 404 }
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

function renderPanel(path = '/') {
  const router = createMemoryRouter([{ path: '*', element: <App /> }], {
    initialEntries: [path],
  })
  render(
    <PanelLanguageProvider>
      <RouterProvider router={router} />
    </PanelLanguageProvider>,
  )
  return router
}

const switcher = (name = 'Мова') => screen.getByRole('group', { name })

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ apiKey: null, connected: false })
  usePanelLanguage.setState({ language: 'uk', desired: 'uk', picked: false, syncedKey: null })
  document.documentElement.lang = 'uk'
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA'])
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PanelLanguageSwitcher in Header', () => {
  it('switches to English, sends PUT {"language":"eng"}, updates <html lang>, and translates header nav', async () => {
    const fetchMock = stubFetch({
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'eng' } },
    })
    useAuthStore.getState().setApiKey('cs_live_key')
    // Wait for initial GET (null) or let it resolve with null first
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const path = new URL(url, 'http://x').pathname
      if (path === LANGUAGE_PATH && init?.method === 'PUT') {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ interface_language: 'eng' }),
          text: () => Promise.resolve(JSON.stringify({ interface_language: 'eng' })),
        }
      }
      if (path === LANGUAGE_PATH) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ interface_language: null }),
          text: () => Promise.resolve(JSON.stringify({ interface_language: null })),
        }
      }
      return {
        ok: false,
        status: 404,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Not Found' }),
        text: () => Promise.resolve(JSON.stringify({ detail: 'Not Found' })),
      }
    })

    renderPanel('/')
    const group = switcher('Мова')
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Українська', 'English'])
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false'])

    fireEvent.click(within(group).getByRole('button', { name: 'English' }))

    expect(await screen.findByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(within(switcher('Language')).getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const putCall = fetchMock.mock.calls.find(
      ([url, init]) => new URL(url, 'http://x').pathname === LANGUAGE_PATH && init?.method === 'PUT',
    )
    expect(putCall).toBeDefined()
    expect(JSON.parse(putCall![1]!.body as string)).toEqual({ language: 'eng' })
  })

  it('when PUT returns 404: still switches to English, shows no error, and keeps the API key', async () => {
    stubFetch({
      [LANGUAGE_PATH]: { status: 404 },
    })
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error')
    useAuthStore.getState().setApiKey('cs_live_key')

    renderPanel('/')
    fireEvent.click(within(switcher('Мова')).getByRole('button', { name: 'English' }))

    expect(await screen.findByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(useAuthStore.getState().apiKey).toBe('cs_live_key')
    expect(localStorage.getItem(STORAGE_KEYS.panelLanguage)).toBe('en')
    expect(localStorage.getItem(STORAGE_KEYS.authorApiKey)).toBe('cs_live_key')
    await waitFor(() => expect(debug).toHaveBeenCalled())
    expect(error).not.toHaveBeenCalled()
  })
})

describe('PanelLanguageSwitcher on LoginPage and sign-in sync', () => {
  it('renders beside SiteHeader links and switches LoginPage in place', async () => {
    stubFetch({})
    renderPanel('/login')

    fireEvent.change(screen.getByLabelText('Ключ доступу'), { target: { value: 'draft-key' } })
    fireEvent.click(within(switcher('Мова')).getByRole('button', { name: 'English' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in for course authors' })).toBeInTheDocument()
    expect(screen.getByLabelText('Access key')).toHaveValue('draft-key')
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/en/pricing/',
    )
    expect(document.documentElement.lang).toBe('en')
  })

  it('on sign-in: GET returning "eng" opens the panel in English', async () => {
    stubFetch({
      [NODES_PATH]: { status: 200, body: [] },
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: 'eng' } },
    })
    renderPanel('/login')

    fireEvent.change(screen.getByLabelText('Ключ доступу'), { target: { value: 'the-key' } })
    fireEvent.click(screen.getByRole('button', { name: 'Увійти' }))

    expect(await screen.findByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
  })

  it('on sign-in: GET returning null keeps the language as it was', async () => {
    stubFetch({
      [NODES_PATH]: { status: 200, body: [] },
      [LANGUAGE_PATH]: { status: 200, body: { interface_language: null } },
    })
    renderPanel('/login')

    fireEvent.change(screen.getByLabelText('Ключ доступу'), { target: { value: 'the-key' } })
    fireEvent.click(screen.getByRole('button', { name: 'Увійти' }))

    expect(await screen.findByRole('link', { name: 'Курси' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('uk')
  })
})
