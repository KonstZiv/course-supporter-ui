import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The shell's activity strip and the boot-time language prefetch: nothing
// reaches the network.
vi.mock('./api/jobs', () => ({
  jobsApi: {
    history: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    get: vi.fn(),
  },
}))
vi.mock('./utils/languages', () => ({
  getLanguages: vi.fn().mockResolvedValue([]),
  getCachedLanguages: vi.fn().mockReturnValue(null),
  findLanguage: vi.fn().mockReturnValue(null),
}))

// Every page is a marker here: this file holds the routes, each page's own tests
// hold the page. The help page can be made to fail, for the error page.
const help = vi.hoisted(() => ({ fails: false }))
vi.mock('./pages/LoginPage', () => ({ LoginPage: () => <h1>page: login</h1> }))
vi.mock('./pages/DashboardPage', () => ({
  DashboardPage: () => <h1>page: courses</h1>,
}))
vi.mock('./pages/CoursePage', () => ({ CoursePage: () => <h1>page: course</h1> }))
vi.mock('./pages/ConfirmRolesPage', () => ({
  ConfirmRolesPage: () => <h1>page: confirm roles</h1>,
}))
vi.mock('./pages/StudentsPage', () => ({
  StudentsPage: () => <h1>page: students</h1>,
}))
vi.mock('./pages/CostPage', () => ({ CostPage: () => <h1>page: cost</h1> }))
vi.mock('./pages/HomeworkCostPage', () => ({
  HomeworkCostPage: () => <h1>page: homework cost</h1>,
}))
vi.mock('./pages/HistoryPage', () => ({ HistoryPage: () => <h1>page: history</h1> }))
vi.mock('./pages/HelpPage', () => ({
  HelpPage: () => {
    if (help.fails) throw new Error('the help page broke')
    return <h1>page: help</h1>
  },
}))

import { createAppRouter } from './router'
import { useAuthStore } from './stores/auth'

function renderAt(path: string) {
  const router = createAppRouter((routes) =>
    createMemoryRouter(routes, { initialEntries: [path] }),
  )
  render(<RouterProvider router={router} />)
  return router
}

// Every address of the program and the page it opens, as App's routes had them
// before the data router.
const PAGES = [
  { path: '/', page: 'courses' },
  { path: '/course/node-1', page: 'course' },
  { path: '/document/doc-1/confirm-roles', page: 'confirm roles' },
  { path: '/students', page: 'students' },
  { path: '/cost', page: 'cost' },
  { path: '/cost/homework', page: 'homework cost' },
  { path: '/history', page: 'history' },
  { path: '/help', page: 'help' },
]

describe('router', () => {
  beforeEach(() => {
    localStorage.clear()
    help.fails = false
    useAuthStore.setState({ apiKey: 'cs_live_key', connected: false })
  })

  describe("serves the app's pages under a data router", () => {
    it.each(PAGES)('opens $path and leaves it by the header', async ({ path, page }) => {
      const router = renderAt(path)
      expect(
        await screen.findByRole('heading', { name: `page: ${page}` }),
      ).toBeInTheDocument()

      // Off to the help page — or, from it, to the history page.
      const [link, next, address] =
        page === 'help'
          ? ['Історія матеріалів', 'history', '/history']
          : ['Довідка', 'help', '/help']
      fireEvent.click(screen.getByRole('link', { name: link }))

      expect(
        await screen.findByRole('heading', { name: `page: ${next}` }),
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe(address)
    })

    it('sends a visitor without a key to the login page', async () => {
      useAuthStore.setState({ apiKey: null })
      const router = renderAt('/students')
      expect(
        await screen.findByRole('heading', { name: 'page: login' }),
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/login')
    })

    it('takes an unknown address to the courses', async () => {
      const router = renderAt('/no-such-page')
      expect(
        await screen.findByRole('heading', { name: 'page: courses' }),
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/')
    })
  })

  it('shows the error page when a page fails to render', async () => {
    help.fails = true
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/help')

    expect(await screen.findByText('Щось пішло не так')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Сторінку не вдалося показати. Оновіть її; якщо повториться, напишіть нам.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Оновити сторінку' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'page: help' })).toBeNull()
    // The author is not shown the error; the console keeps it.
    expect(logged).toHaveBeenCalledWith('Page failed to render', expect.any(Error))
    logged.mockRestore()
  })
})
