import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The shell's activity strip and the boot-time language prefetch: nothing
// reaches the network but the sign-in check, which each test answers itself.
vi.mock('../api/jobs', () => ({
  jobsApi: {
    history: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    get: vi.fn(),
  },
}))
vi.mock('../utils/languages', () => ({
  getLanguages: vi.fn().mockResolvedValue([]),
  getCachedLanguages: vi.fn().mockReturnValue(null),
  findLanguage: vi.fn().mockReturnValue(null),
}))
// Where sign-in leads: markers, not the pages.
vi.mock('./DashboardPage', () => ({ DashboardPage: () => <h1>page: courses</h1> }))
vi.mock('./StudentsPage', () => ({ StudentsPage: () => <h1>page: students</h1> }))

import { LoginPage } from './LoginPage'
import { createAppRouter } from '../router'
import { useAuthStore } from '../stores/auth'
import { SUPPORT_ADDRESS } from '../utils/contactAdmin'
import { docsUrl, siteUrl } from '../components/site/siteLinks'

const fetchMock = vi.fn()

/** The sign-in page alone, opened as ProtectedRoute would open it. */
function renderLogin(from?: unknown) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <h1>page: courses</h1> },
      { path: '*', element: <h1>page: elsewhere</h1> },
    ],
    { initialEntries: [{ pathname: '/login', state: from === undefined ? null : { from } }] },
  )
  render(<RouterProvider router={router} />)
  return router
}

function signIn(key = 'the-key') {
  fireEvent.change(screen.getByLabelText('Ключ доступу'), { target: { value: key } })
  fireEvent.click(screen.getByRole('button', { name: 'Увійти' }))
}

function answer(status: number) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status })
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ apiKey: null, connected: false })
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('texts', () => {
    it('says what the program is and how to sign in', () => {
      renderLogin()
      expect(
        screen.getByRole('heading', { level: 1, name: 'Вхід для авторів курсів' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Програма автора — місце, де автор готує свій курс на платформі Course Supporter: ' +
            'завантажує матеріали, налаштовує завдання й тести, додає студентів.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Щоб увійти, введіть ключ доступу, який вам надіслав адміністратор платформи.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Ключ зберігається лише в цьому браузері; кнопка «Вийти» в програмі його прибирає.',
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Студентам: ваш курс відкривається за посиланням від автора курсу — вхід там.',
        ),
      ).toBeInTheDocument()
    })

    it('has a password field for the key, with no placeholder and no autocomplete', () => {
      renderLogin()
      const field = screen.getByLabelText('Ключ доступу')
      expect(field).toHaveAttribute('type', 'password')
      expect(field).not.toHaveAttribute('placeholder')
      expect(field).toHaveAttribute('autocomplete', 'off')
      expect(field).toHaveFocus()
    })

    it('tells a newcomer how to become an author', () => {
      renderLogin()
      const block = screen.getByRole('heading', { level: 2, name: 'Ще не автор?' })
        .parentElement as HTMLElement
      expect(
        within(block).getByText('Доступ до програми автора платформа відкриває за зверненням.'),
      ).toBeInTheDocument()
      expect(within(block).getByRole('link', { name: 'Як стати автором' })).toHaveAttribute(
        'href',
        siteUrl('uk', 'become-author'),
      )
      expect(siteUrl('uk', 'become-author')).toBe('https://pythoncourse.me/uk/become-author/')
    })

    it('offers a letter to the administrator, with the address as text', () => {
      renderLogin()
      const block = screen.getByRole('heading', {
        level: 2,
        name: 'Немає ключа або він не підходить?',
      }).parentElement as HTMLElement
      expect(
        within(block).getByRole('link', { name: 'Написати адміністраторові платформи' }),
      ).toHaveAttribute('href', expect.stringContaining(`mailto:${SUPPORT_ADDRESS}`))
      expect(within(block).getByText(SUPPORT_ADDRESS)).toBeInTheDocument()
    })

    it("is framed by the site's header and footer", () => {
      renderLogin()
      expect(screen.getByRole('link', { name: 'Ціни' })).toHaveAttribute(
        'href',
        siteUrl('uk', 'pricing'),
      )
      expect(screen.getByRole('link', { name: 'Документація' })).toHaveAttribute(
        'href',
        docsUrl('uk', 'authors/'),
      )
      expect(screen.getByRole('contentinfo')).toHaveTextContent('EXSOL DOO, Чорногорія')
    })

    it('uses no technical words', () => {
      renderLogin()
      const text = document.body.textContent ?? ''
      expect(text).not.toMatch(/API/)
      expect(text).not.toMatch(/cs_live/)
      expect(text).not.toMatch(/\bAI\b/)
      expect(text).not.toMatch(/URL/)
    })
  })

  describe('errors', () => {
    it.each([401, 403])('a rejected key (%i)', async (status) => {
      answer(status)
      renderLogin()
      signIn()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Цей ключ доступу не підходить. Перевірте, чи скопійовано його повністю, або ' +
          'напишіть адміністраторові платформи.',
      )
      expect(useAuthStore.getState().apiKey).toBeNull()
    })

    it('another answer of the server (500)', async () => {
      answer(500)
      renderLogin()
      signIn()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Платформа зараз не відповідає. Спробуйте за кілька хвилин; якщо повториться, ' +
          'напишіть адміністраторові платформи.',
      )
    })

    it('no connection', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      renderLogin()
      signIn()
      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Не вдалося з'єднатися з платформою. Перевірте з'єднання з інтернетом і спробуйте ще раз.",
      )
    })
  })

  describe('after sign-in', () => {
    it('checks the key and keeps it', async () => {
      answer(200)
      renderLogin()
      signIn('  the-key  ')
      expect(await screen.findByRole('heading', { name: 'page: courses' })).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/nodes\?limit=1$/),
        { headers: { 'X-API-Key': 'the-key' } },
      )
      expect(useAuthStore.getState().apiKey).toBe('the-key')
    })

    it('goes back to the address the author was opening', async () => {
      answer(200)
      const router = createAppRouter((routes) =>
        createMemoryRouter(routes, { initialEntries: ['/students?x=1'] }),
      )
      render(<RouterProvider router={router} />)

      expect(
        await screen.findByRole('heading', { name: 'Вхід для авторів курсів' }),
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/login')

      signIn()
      expect(await screen.findByRole('heading', { name: 'page: students' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/students')
      expect(router.state.location.search).toBe('?x=1')
    })

    it.each(['//evil.example', 'https://evil.example'])(
      'goes to the courses when the address leads off the program (%s)',
      async (from) => {
        answer(200)
        const router = renderLogin(from)
        signIn()
        expect(await screen.findByRole('heading', { name: 'page: courses' })).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/')
      },
    )

    it('goes to the courses when there is no address to go back to', async () => {
      answer(200)
      const router = renderLogin()
      signIn()
      expect(await screen.findByRole('heading', { name: 'page: courses' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/')
    })
  })
})
