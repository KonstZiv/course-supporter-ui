import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// The guarded render mounts the shell (activity strip) and the history page; mock
// their doors and the boot-time language prefetch so nothing hits the network.
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

import App from './App'
import { useAuthStore } from './stores/auth'

const HISTORY_MARK = /Що відбувалося з вашими матеріалами/

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App — /history under the shared auth guard (§3 c7, clar.3)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ apiKey: null, connected: false })
  })

  it('renders the history page when authenticated — no route-specific guard', async () => {
    useAuthStore.setState({ apiKey: 'cs_live_key' })
    renderAt('/history')
    expect(await screen.findByText(HISTORY_MARK)).toBeInTheDocument()
  })

  it('redirects /history to login without a key (the shared guard, not its own)', async () => {
    useAuthStore.setState({ apiKey: null })
    renderAt('/history')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Вхід для авторів курсів' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(HISTORY_MARK)).toBeNull()
  })
})

describe('App — /help route renders the seam stub (Є3, Р10)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ apiKey: null, connected: false })
  })

  it('renders the help page at /help', async () => {
    useAuthStore.setState({ apiKey: 'cs_live_key' })
    renderAt('/help')
    // The heading role disambiguates the page title from the header nav item,
    // which also carries the accessible name "Довідка".
    expect(
      await screen.findByRole('heading', { name: 'Довідка' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Шлях автора за кроками й допомога'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Цей розділ ще готується.')).toBeNull()
  })
})

// The payment provider requires the support address on every screen: the
// shell after sign-in and the sign-in page each show the site's footer once.
describe('App — the support address in the site footer', () => {
  const SUPPORT = 'support@pythoncourse.me'

  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ apiKey: null, connected: false })
  })

  it.each(['/history', '/help'])('%s under the shell: one footer with the support link', async (path) => {
    useAuthStore.setState({ apiKey: 'cs_live_key' })
    renderAt(path)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: SUPPORT })).toHaveAttribute(
      'href',
      `mailto:${SUPPORT}`,
    )
  })

  it('/login: exactly one footer and one support link', async () => {
    renderAt('/login')
    await screen.findByRole('heading', { level: 1, name: 'Вхід для авторів курсів' })
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
    expect(screen.getAllByRole('link', { name: SUPPORT })).toHaveLength(1)
  })
})
