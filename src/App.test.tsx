import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    expect(await screen.findByText('Вхід')).toBeInTheDocument()
    expect(screen.queryByText(HISTORY_MARK)).toBeNull()
  })
})
