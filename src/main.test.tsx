import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'

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

// A page that guards leaving, as the test editor does (task 07c): `useBlocker`
// throws outside a data router, so this page renders only if the entry mounts one.
vi.mock('./pages/HelpPage', async () => {
  const { useBlocker } = await import('react-router-dom')
  function HelpPage() {
    useBlocker(false)
    return <h1>page: help, can guard leaving</h1>
  }
  return { HelpPage }
})

import { useAuthStore } from './stores/auth'

describe('main', () => {
  it('mounts the app under a data router, so a page can guard leaving', async () => {
    useAuthStore.setState({ apiKey: 'cs_live_key', connected: false })
    window.history.pushState({}, '', '/help')
    document.body.innerHTML = '<div id="root"></div>'

    // The entry itself, as the browser runs it.
    await import('./main')

    expect(
      await screen.findByRole('heading', { name: 'page: help, can guard leaving' }),
    ).toBeInTheDocument()
  })
})
