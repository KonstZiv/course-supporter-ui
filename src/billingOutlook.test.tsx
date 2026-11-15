import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { BillingOutlookResponse } from './types/api'

// The author's reminders (5.1) and the banner of the students' reviews waiting
// for units (5.4), on the real pages of the program; one outlook per page.
// The shell's activity strip and the boot-time language prefetch reach no
// network; the pages' own requests are mocked.
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
vi.mock('./api/nodes', () => ({
  nodesApi: { listRoots: vi.fn().mockResolvedValue({ items: [], total: 0 }) },
}))
vi.mock('./api/students', () => ({
  studentsApi: { list: vi.fn().mockResolvedValue([]) },
}))
const api = vi.hoisted(() => ({
  billingOutlook: vi.fn(),
  billingSpending: vi.fn(),
  getTerms: vi.fn(),
  getPackages: vi.fn(),
  getCheckout: vi.fn(),
  getBalance: vi.fn(),
  getStatement: vi.fn(),
}))
vi.mock('./api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/billing')>()),
  ...api,
}))

import { createAppRouter } from './router'
import { useAuthStore } from './stores/auth'
import { useOutlookStore } from './stores/billingOutlook'

const QUIET: BillingOutlookResponse = {
  days_left: null,
  warning: null,
  expiring_soon: null,
  held_reviews: { count: 0, oldest_at: null, missing_units: 0 },
}
const RUNS_OUT: BillingOutlookResponse = { ...QUIET, warning: 'runs_out_soon', days_left: 5 }
const EXPIRING: BillingOutlookResponse = {
  ...QUIET,
  expiring_soon: { units: 300, expires_on: '2026-11-30' },
}
const HELD_MISSING: BillingOutlookResponse = {
  ...QUIET,
  held_reviews: { count: 2, oldest_at: '2026-11-14T10:00:00Z', missing_units: 150 },
}
const HELD_COVERED: BillingOutlookResponse = {
  ...QUIET,
  held_reviews: { count: 5, oldest_at: '2026-11-14T10:00:00Z', missing_units: 0 },
}

const RUNS_OUT_TEXT = 'За вашого темпу юнітів вистачить приблизно на 5 днів.'
const EXPIRING_TEXT = '300 юнітів згорить 30 листопада 2026: тоді закінчується строк пакета.'
const HELD_TEXT =
  'Перевірки робіт ваших студентів чекають юнітів: 2 роботи. Щоб вони почалися, потрібно ще 150 юнітів.'
const COVERED_TEXT =
  'Юнітів уже вистачає: перевірки робіт ваших студентів (5 робіт) почнуться найближчим часом.'

function renderAt(path: string) {
  const router = createAppRouter((routes) =>
    createMemoryRouter(routes, { initialEntries: [path] }),
  )
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ apiKey: 'cs_live_key', connected: false })
  useOutlookStore.getState().reset()
  for (const mock of Object.values(api)) mock.mockReset()
  api.billingOutlook.mockResolvedValue(QUIET)
  api.billingSpending.mockResolvedValue({
    period: { from: '2026-11-01', to: '2026-11-30' },
    charging_enabled: false,
    totals: { billed_units: 0, covered_units: 0 },
    courses: [],
    unlinked: { billed_units: 0, covered_units: 0 },
  })
  api.getBalance.mockResolvedValue({
    balance: 900,
    reserved: 0,
    held: 0,
    available: 900,
    difference: 0,
    next_expiry: null,
  })
  api.getPackages.mockResolvedValue({ packages: [], purchase: { open: true, reason: null } })
  api.getStatement.mockResolvedValue({ items: [], next_cursor: null })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('reminders (5.1)', () => {
  it('runs out soon: on «Мої курси», with «Купити юніти» leading to «Юніти»', async () => {
    api.billingOutlook.mockResolvedValue(RUNS_OUT)
    const router = renderAt('/')
    const line = await screen.findByText(RUNS_OUT_TEXT)
    const reminder = line.parentElement!
    expect(reminder).toHaveClass('bg-amber-pale', 'text-ink')
    fireEvent.click(within(reminder).getByRole('link', { name: 'Купити юніти' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/billing'))
  })

  it('units expiring: the line, and a link to «Юніти»', async () => {
    api.billingOutlook.mockResolvedValue(EXPIRING)
    renderAt('/')
    const line = await screen.findByText(EXPIRING_TEXT)
    expect(within(line.parentElement!).getByRole('link', { name: 'Юніти' })).toHaveAttribute(
      'href',
      '/billing',
    )
  })

  it('neither: no reminder', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: 'Мої курси' })
    await waitFor(() => expect(api.billingOutlook).toHaveBeenCalled())
    expect(screen.queryByTestId('billing-reminders')).toBeNull()
  })

  it('on «Юніти»: under the balance; «Купити юніти» scrolls to the packages; no link to itself', async () => {
    api.billingOutlook.mockResolvedValue({ ...RUNS_OUT, expiring_soon: EXPIRING.expiring_soon })
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const router = renderAt('/billing')
    const line = await screen.findByText(RUNS_OUT_TEXT)
    const place = screen.getByText('Доступно: 900 юнітів').nextElementSibling as HTMLElement
    expect(place).toHaveAttribute('data-billing-reminders')
    expect(place).toContainElement(line)
    expect(within(place).getByText(EXPIRING_TEXT)).toBeInTheDocument()
    expect(within(place).queryByRole('link', { name: 'Юніти' })).toBeNull()
    fireEvent.click(within(place).getByRole('button', { name: 'Купити юніти' }))
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('billing-packages'))
    expect(router.state.location.pathname).toBe('/billing')
  })
})

describe('students’ reviews waiting for units (5.4)', () => {
  it.each(['/', '/students', '/cost', '/cost/homework', '/billing', '/help'])(
    'the banner is under the header on %s',
    async (path) => {
      api.billingOutlook.mockResolvedValue(HELD_MISSING)
      renderAt(path)
      const banner = await screen.findByTestId('held-reviews-banner')
      expect(banner).toHaveTextContent(HELD_TEXT)
      expect(banner).toHaveClass('bg-amber-pale', 'text-ink')
      expect(banner.previousElementSibling?.tagName).toBe('HEADER')
    },
  )

  it('units missing: «Купити юніти» leads to «Юніти»', async () => {
    api.billingOutlook.mockResolvedValue(HELD_MISSING)
    const router = renderAt('/')
    const banner = await screen.findByTestId('held-reviews-banner')
    fireEvent.click(within(banner).getByRole('link', { name: 'Купити юніти' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/billing'))
  })

  it('on «Юніти»: «Купити юніти» scrolls to the packages', async () => {
    api.billingOutlook.mockResolvedValue(HELD_MISSING)
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    renderAt('/billing')
    const banner = await screen.findByTestId('held-reviews-banner')
    fireEvent.click(within(banner).getByRole('button', { name: 'Купити юніти' }))
    expect(scroll).toHaveBeenCalledTimes(1)
  })

  it('nothing missing: they start soon, no purchase', async () => {
    api.billingOutlook.mockResolvedValue(HELD_COVERED)
    renderAt('/')
    const banner = await screen.findByTestId('held-reviews-banner')
    expect(banner).toHaveTextContent(COVERED_TEXT)
    expect(within(banner).queryByRole('link')).toBeNull()
    expect(within(banner).queryByRole('button')).toBeNull()
  })

  it('none waiting: no banner', async () => {
    renderAt('/')
    await waitFor(() => expect(api.billingOutlook).toHaveBeenCalled())
    await screen.findByRole('heading', { name: 'Мої курси' })
    expect(screen.queryByTestId('held-reviews-banner')).toBeNull()
  })
})

describe('one outlook per page', () => {
  it('the banner and the reminders read one answer', async () => {
    api.billingOutlook.mockResolvedValue({ ...HELD_MISSING, ...RUNS_OUT, held_reviews: HELD_MISSING.held_reviews })
    renderAt('/')
    await screen.findByTestId('held-reviews-banner')
    await screen.findByText(RUNS_OUT_TEXT)
    expect(api.billingOutlook).toHaveBeenCalledTimes(1)
  })

  it('asked again when the route changes, and when the tab comes back into view', async () => {
    const router = renderAt('/')
    await waitFor(() => expect(api.billingOutlook).toHaveBeenCalledTimes(1))

    api.billingOutlook.mockResolvedValue(HELD_MISSING)
    await act(async () => {
      await router.navigate('/students')
    })
    await screen.findByTestId('held-reviews-banner')
    expect(api.billingOutlook).toHaveBeenCalledTimes(2)

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    api.billingOutlook.mockResolvedValue(QUIET)
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(screen.queryByTestId('held-reviews-banner')).toBeNull())
    expect(api.billingOutlook).toHaveBeenCalledTimes(3)
  })

  it('a hidden tab is not asked', async () => {
    renderAt('/')
    await waitFor(() => expect(api.billingOutlook).toHaveBeenCalledTimes(1))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(api.billingOutlook).toHaveBeenCalledTimes(1)
  })
})
