import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type {
  PortalBillingBalance,
  PortalBillingOutlook,
  PortalBillingPackages,
  PortalPublicNumbers,
} from '../types'
import { formatReviews } from '../../utils/units'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import type { Language } from '../../i18n/languages'

// Stage 2b, 5.4: "вистачить приблизно на N перевірок" and the reminders, on
// "Юніти" under what is available and on "Мої курси" under the greeting —
// only for a student who pays, and only while charging is on (operator
// 2026-11-16, A); nothing while the answer is on its way, when it failed, or
// when the author pays.

const api = vi.hoisted(() => ({
  billingBalance: vi.fn(),
  billingOutlook: vi.fn(),
  billingPackages: vi.fn(),
  billingStatement: vi.fn(),
  courses: vi.fn(),
  publicNumbers: vi.fn(),
}))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalApi: { ...actual.portalApi, ...api } }
})

import { PortalBillingPage } from './PortalBillingPage'
import { PortalHomePage } from './PortalHomePage'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'

const BALANCE: PortalBillingBalance = {
  balance: 120,
  reserved: 0,
  held: 0,
  available: 120,
  difference: 0,
  next_expiry: null,
}
const PACKAGES: PortalBillingPackages = {
  packages: [{ id: 'p1', units: 500, validity_months: 6, prices_minor: { EUR: 999 } }],
  purchase: { open: true, reason: null },
}

const outlook = (over: Partial<PortalBillingOutlook> = {}): PortalBillingOutlook => ({
  reviews_left: 8,
  warning: null,
  expiring_soon: null,
  paid_by: 'self',
  charging_enabled: true,
  ...over,
})

// Charging off, with everything the outlook could warn about.
const CHARGING_OFF = outlook({
  charging_enabled: false,
  reviews_left: 0,
  warning: 'next_may_fail',
  expiring_soon: { units: 500, expires_on: '2026-12-01' },
})

const LOW = 'Юнітів вистачить приблизно на 2 перевірки. Купіть пакет заздалегідь, щоб подавати роботи без перерви.'
const NEXT = 'На наступну перевірку юнітів може не вистачити.'
const EXPIRY = '500 юнітів згорить 1 грудня 2026: тоді закінчується строк пакета.'

function renderAt(path: string, language: Language = 'uk') {
  const router = createMemoryRouter(
    [
      { path: '/:tenantId/billing', element: <PortalBillingPage /> },
      { path: '/:tenantId/home', element: <PortalHomePage /> },
    ],
    { initialEntries: [path] },
  )
  render(
    <LanguageProvider language={language}>
      <RouterProvider router={router} />
    </LanguageProvider>,
  )
  return router
}

const settle = () => act(async () => {})

const PUBLIC_NUMBERS: PortalPublicNumbers = {
  contract_version: 1,
  packages: [
    { id: 'units-500-v1', units: 500, price_minor: 999, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
    { id: 'units-1500-v1', units: 1500, price_minor: 1499, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
  ],
  review_cost: {
    homework: {
      status: 'ready',
      actual: { min: 44, typical: 72, max: 163 },
      smallest_package_reviews: { low: 2, typical: 4, high: 7 },
    },
  },
}

const ZERO_BALANCE: PortalBillingBalance = { ...BALANCE, balance: 0, available: 0 }

const ZERO_PRICED_UK =
  'Перевірки робіт платні. Одна перевірка зазвичай коштує 72 юніти (від 44 до 163; перевірка проєкту — дорожче). Найменшого пакета (500 юнітів) вистачає приблизно на 2–7 перевірок.'
const ZERO_PRICED_EN =
  'Reviews of your work are paid. One review usually costs 72 units (from 44 to 163; a project review costs more). The smallest package (500 units) covers about 2–7 reviews.'
const ZERO_PLAIN_UK = 'Перевірки робіт оплачуються юнітами.'
const ZERO_PLAIN_EN = 'Reviews of your work are paid for in units.'

beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset()
  api.billingBalance.mockResolvedValue(BALANCE)
  api.billingPackages.mockResolvedValue(PACKAGES)
  api.billingStatement.mockResolvedValue({ items: [], next_cursor: null })
  api.courses.mockResolvedValue([])
  api.billingOutlook.mockResolvedValue(outlook())
  api.publicNumbers.mockResolvedValue(PUBLIC_NUMBERS)
})

// jsdom draws nothing, so it has no scrolling of its own: a test puts one in
// and the original (absent) comes back after it.
const SCROLL = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')

afterEach(() => {
  vi.restoreAllMocks()
  if (SCROLL) Object.defineProperty(Element.prototype, 'scrollIntoView', SCROLL)
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

describe('formatReviews', () => {
  it.each([
    [1, '1 перевірку'],
    [2, '2 перевірки'],
    [5, '5 перевірок'],
    [11, '11 перевірок'],
    [21, '21 перевірку'],
    [22, '22 перевірки'],
    [25, '25 перевірок'],
  ])('%i → «%s»', (n, words) => {
    expect(formatReviews('uk', n)).toBe(words)
  })
})

describe('"Юніти"', () => {
  it('says how many reviews the units cover, right under "Доступно"', async () => {
    renderAt(`/${T}/billing`)
    const line = await screen.findByText('Вистачить приблизно на 8 перевірок.')
    const place = screen.getByText('Доступно: 120 юнітів').nextElementSibling!
    expect(place).toHaveAttribute('data-billing-reminders')
    expect(place).toContainElement(line)
  })

  it('no line when the outlook knows no count', async () => {
    api.billingOutlook.mockResolvedValue(outlook({ reviews_left: null }))
    renderAt(`/${T}/billing`)
    await screen.findByText('Доступно: 120 юнітів')
    await settle()
    expect(screen.queryByText(/Вистачить приблизно/)).toBeNull()
  })

  it.each([
    ['low', outlook({ reviews_left: 2, warning: 'low' }), LOW],
    ['next_may_fail', outlook({ reviews_left: 0, warning: 'next_may_fail' }), NEXT],
  ])('%s → the reminder, and "Купити юніти" scrolls to the packages', async (_, found, text) => {
    api.billingOutlook.mockResolvedValue(found)
    const scroll = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scroll,
    })
    renderAt(`/${T}/billing`)
    const item = (await screen.findByText(text)).closest('li')!
    expect(item).toHaveClass('bg-amber-pale', 'text-ink')
    fireEvent.click(within(item).getByRole('button', { name: 'Купити юніти' }))
    const packages = document.getElementById('units-packages')!
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(scroll.mock.contexts[0]).toBe(packages)
    expect(document.activeElement).toBe(packages)
  })

  it('units about to expire → the reminder, no link of its own on this page', async () => {
    api.billingOutlook.mockResolvedValue(
      outlook({ expiring_soon: { units: 500, expires_on: '2026-12-01' } }),
    )
    renderAt(`/${T}/billing`)
    const item = (await screen.findByText(EXPIRY)).closest('li')!
    expect(within(item).queryByRole('link')).toBeNull()
    expect(within(item).queryByRole('button')).toBeNull()
  })

  it('reads the outlook again when the tab comes back into view', async () => {
    renderAt(`/${T}/billing`)
    await screen.findByText('Вистачить приблизно на 8 перевірок.')
    api.billingOutlook.mockResolvedValue(outlook({ reviews_left: 3, warning: 'low' }))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText('Вистачить приблизно на 3 перевірки.')).toBeInTheDocument()
    expect(screen.getByText(/Юнітів вистачить приблизно на 3 перевірки\./)).toBeInTheDocument()
  })

  it.each([
    ['the author pays', () => api.billingOutlook.mockResolvedValue(outlook({ paid_by: 'author', warning: 'low' }))],
    ['the outlook failed', () => api.billingOutlook.mockRejectedValue(new Error('down'))],
  ])('%s → nothing under "Доступно"', async (_, arrange) => {
    arrange()
    renderAt(`/${T}/billing`)
    const place = (await screen.findByText('Доступно: 120 юнітів')).nextElementSibling
    await settle()
    expect(place).toBeEmptyDOMElement()
  })
})

describe('charging off (operator 2026-11-16, A): nothing about units running short', () => {
  it('"Юніти": what is available and the packages stay; no "Вистачить…", no reminders', async () => {
    api.billingOutlook.mockResolvedValue(CHARGING_OFF)
    renderAt(`/${T}/billing`)
    const main = await screen.findByText('Доступно: 120 юнітів')
    expect(await screen.findByRole('button', { name: 'Купити' })).toBeInTheDocument()
    await settle()
    expect(main.nextElementSibling).toBeEmptyDOMElement()
    expect(screen.queryByText(/Вистачить приблизно/)).toBeNull()
    expect(screen.queryByText(NEXT)).toBeNull()
    expect(screen.queryByText(EXPIRY)).toBeNull()
    expect(screen.queryByRole('list', { name: 'Нагадування про юніти' })).toBeNull()
  })

  it('"Мої курси": no line about units and no reminders', async () => {
    api.billingOutlook.mockResolvedValue(CHARGING_OFF)
    renderAt(`/${T}/home`)
    await screen.findByText('Вас поки не зараховано на жоден курс.')
    await settle()
    expect(api.billingOutlook).toHaveBeenCalled()
    expect(screen.queryByText(/Доступно|вистачить|згорить/i)).toBeNull()
    expect(screen.queryByText(NEXT)).toBeNull()
    expect(screen.queryByRole('list', { name: 'Нагадування про юніти' })).toBeNull()
  })

  it('charging turned on while the tab was away → the lines come on its return', async () => {
    api.billingOutlook.mockResolvedValue(CHARGING_OFF)
    renderAt(`/${T}/home`)
    await screen.findByText('Вас поки не зараховано на жоден курс.')
    await settle()
    expect(screen.queryByText(NEXT)).toBeNull()
    api.billingOutlook.mockResolvedValue({ ...CHARGING_OFF, charging_enabled: true })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(screen.getByText(NEXT)).toBeInTheDocument()
    expect(screen.getByText('Доступно 120 юнітів.')).toBeInTheDocument()
  })
})

describe('"Мої курси"', () => {
  it('what is available and how many reviews it covers, under the greeting', async () => {
    renderAt(`/${T}/home`)
    const line = await screen.findByText('Доступно 120 юнітів — вистачить приблизно на 8 перевірок.')
    const greeting = screen.getByRole('heading', { level: 1 })
    expect(greeting.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('without the second part when the outlook knows no count', async () => {
    api.billingOutlook.mockResolvedValue(outlook({ reviews_left: null }))
    renderAt(`/${T}/home`)
    expect(await screen.findByText('Доступно 120 юнітів.')).toBeInTheDocument()
  })

  it.each([
    ['low', outlook({ reviews_left: 2, warning: 'low' }), LOW],
    ['next_may_fail', outlook({ reviews_left: 0, warning: 'next_may_fail' }), NEXT],
  ])('%s → the reminder, and "Купити юніти" goes to "Юніти"', async (_, found, text) => {
    api.billingOutlook.mockResolvedValue(found)
    const router = renderAt(`/${T}/home`)
    const item = (await screen.findByText(text)).closest('li')!
    const link = within(item).getByRole('link', { name: 'Купити юніти' })
    expect(link).toHaveAttribute('href', `/${T}/billing`)
    expect(link).not.toHaveAttribute('target')
    fireEvent.click(link)
    await settle()
    expect(router.state.location.pathname).toBe(`/${T}/billing`)
  })

  it('units about to expire → the reminder with a link to "Юніти"', async () => {
    api.billingOutlook.mockResolvedValue(
      outlook({ expiring_soon: { units: 500, expires_on: '2026-12-01' } }),
    )
    renderAt(`/${T}/home`)
    const item = (await screen.findByText(EXPIRY)).closest('li')!
    expect(within(item).getByRole('link', { name: 'Юніти' })).toHaveAttribute('href', `/${T}/billing`)
  })

  it('all three at once', async () => {
    api.billingOutlook.mockResolvedValue(
      outlook({
        reviews_left: 2,
        warning: 'low',
        expiring_soon: { units: 500, expires_on: '2026-12-01' },
      }),
    )
    renderAt(`/${T}/home`)
    const list = await screen.findByRole('list', { name: 'Нагадування про юніти' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText(LOW)).toBeInTheDocument()
    expect(within(list).getByText(EXPIRY)).toBeInTheDocument()
  })

  it.each([
    ['the author pays', () => api.billingOutlook.mockResolvedValue(outlook({ paid_by: 'author', warning: 'low', expiring_soon: { units: 5, expires_on: '2026-12-01' } }))],
    ['the outlook failed', () => api.billingOutlook.mockRejectedValue(new Error('down'))],
    ['the balance failed', () => api.billingBalance.mockRejectedValue(new Error('down'))],
  ])('%s → no line about units', async (_, arrange) => {
    arrange()
    renderAt(`/${T}/home`)
    await screen.findByText('Вас поки не зараховано на жоден курс.')
    await settle()
    expect(screen.queryByText(/Доступно|вистачить|згорить/i)).toBeNull()
  })

  it('nothing while the answers are on their way', async () => {
    api.billingOutlook.mockReturnValue(new Promise(() => undefined))
    renderAt(`/${T}/home`)
    await screen.findByText('Вас поки не зараховано на жоден курс.')
    expect(screen.queryByText(/Доступно/)).toBeNull()
  })
})

describe('zero units line (Г-45)', () => {
  it.each([
    ['home', `/${T}/home`, 'link', 'uk', ZERO_PRICED_UK, 'Купити юніти'],
    ['home', `/${T}/home`, 'link', 'en', ZERO_PRICED_EN, 'Buy units'],
    ['billing', `/${T}/billing`, 'button', 'uk', ZERO_PRICED_UK, 'Купити юніти'],
    ['billing', `/${T}/billing`, 'button', 'en', ZERO_PRICED_EN, 'Buy units'],
  ] as const)(
    '%s (%s): available 0 + ready numbers → variant A, buy action present, no nextMayFail',
    async (_, path, actionRole, lang, expectedText, buyLabel) => {
      api.billingBalance.mockResolvedValue(ZERO_BALANCE)
      api.billingOutlook.mockResolvedValue(outlook({ reviews_left: 0, warning: 'next_may_fail' }))
      renderAt(path, lang)
      const item = (await screen.findByText(expectedText)).closest('li')!
      expect(within(item).getByRole(actionRole, { name: buyLabel })).toBeInTheDocument()
      expect(screen.queryByText(NEXT)).toBeNull()
      expect(screen.queryByText('You may not have enough units for the next review.')).toBeNull()
      expect(api.publicNumbers).toHaveBeenCalledTimes(1)
    },
  )

  it('reads publicNumbers only once on open, not again on tab return', async () => {
    api.billingBalance.mockResolvedValue(ZERO_BALANCE)
    api.billingOutlook.mockResolvedValue(outlook({ reviews_left: 0, warning: 'next_may_fail' }))
    renderAt(`/${T}/home`)
    await screen.findByText(ZERO_PRICED_UK)
    expect(api.publicNumbers).toHaveBeenCalledTimes(1)

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(api.publicNumbers).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['home', `/${T}/home`, 'uk', ZERO_PLAIN_UK],
    ['home', `/${T}/home`, 'en', ZERO_PLAIN_EN],
    ['billing', `/${T}/billing`, 'uk', ZERO_PLAIN_UK],
    ['billing', `/${T}/billing`, 'en', ZERO_PLAIN_EN],
  ] as const)(
    '%s (%s): available 0 + insufficient_data → variant B',
    async (_, path, lang, expectedText) => {
      api.billingBalance.mockResolvedValue(ZERO_BALANCE)
      api.billingOutlook.mockResolvedValue(outlook({ reviews_left: null, warning: null }))
      api.publicNumbers.mockResolvedValue({
        ...PUBLIC_NUMBERS,
        review_cost: {
          homework: { status: 'insufficient_data', actual: null, smallest_package_reviews: null },
        },
      })
      renderAt(path, lang)
      expect(await screen.findByText(expectedText)).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
    },
  )

  it.each([
    ['home', `/${T}/home`],
    ['billing', `/${T}/billing`],
  ] as const)(
    '%s: available 0 + publicNumbers rejected → variant B, no error on page',
    async (_, path) => {
      api.billingBalance.mockResolvedValue(ZERO_BALANCE)
      api.billingOutlook.mockResolvedValue(outlook({ reviews_left: 0, warning: 'next_may_fail' }))
      api.publicNumbers.mockRejectedValue(new Error('network error'))
      renderAt(path)
      expect(await screen.findByText(ZERO_PLAIN_UK)).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByText(NEXT)).toBeNull()
    },
  )

  it.each([
    ['home', `/${T}/home`],
    ['billing', `/${T}/billing`],
  ] as const)(
    '%s: available 5 + warning next_may_fail → nextMayFail as before, no publicNumbers call',
    async (_, path) => {
      api.billingBalance.mockResolvedValue({ ...BALANCE, balance: 5, available: 5 })
      api.billingOutlook.mockResolvedValue(outlook({ reviews_left: 0, warning: 'next_may_fail' }))
      renderAt(path)
      expect(await screen.findByText(NEXT)).toBeInTheDocument()
      expect(api.publicNumbers).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['home', `/${T}/home`],
    ['billing', `/${T}/billing`],
  ] as const)(
    '%s: paid_by author with available 0 → nothing new, no publicNumbers call',
    async (_, path) => {
      api.billingBalance.mockResolvedValue(ZERO_BALANCE)
      api.billingOutlook.mockResolvedValue(outlook({ paid_by: 'author', reviews_left: null, warning: null }))
      renderAt(path)
      await settle()
      expect(api.publicNumbers).not.toHaveBeenCalled()
      expect(screen.queryByText(ZERO_PRICED_UK)).toBeNull()
      expect(screen.queryByText(ZERO_PLAIN_UK)).toBeNull()
    },
  )
})
