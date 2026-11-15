import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type {
  PortalBillingBalance,
  PortalBillingCheckoutState,
  PortalBillingPackages,
  PortalBillingStatement,
  PortalBillingStatementItem,
  PortalBillingTerms,
} from '../types'

// The student's "Юніти": the same cases as the author's page (BillingPage
// tests), with the portal's requests, words and the way back to the work.
// The requests are mocked; `billingReason` and `PortalApiError` stay the real
// ones, so a refusal is read by its code exactly as on the server's answer.
const api = vi.hoisted(() => ({
  billingTerms: vi.fn(),
  billingConsent: vi.fn(),
  billingPackages: vi.fn(),
  billingCheckout: vi.fn(),
  billingCheckoutState: vi.fn(),
  billingBalance: vi.fn(),
  billingStatement: vi.fn(),
  billingOutlook: vi.fn(),
}))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApiError } from '../api/portalClient'
import { PortalBillingPage } from './PortalBillingPage'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const NB = '\u00a0'
const SHA = 'ff89a2f5ebab4d8f5956fcc590160d961283b414a8e953bec428d5c06d6cb33f'
const MAIL = 'mailto:support@pythoncourse.me'

const ZERO_BALANCE: PortalBillingBalance = {
  balance: 0,
  reserved: 0,
  held: 0,
  available: 0,
  difference: 0,
  next_expiry: null,
}

// `difference` is never above 0 for a student; set here to prove the page
// says nothing about it whatever comes.
const FULL_BALANCE: PortalBillingBalance = {
  balance: 1730,
  reserved: 120,
  held: 80,
  available: 1530,
  difference: 30,
  next_expiry: { units: 500, expires_on: '2026-11-15' },
}

// Ids no screen text would ever contain, so their absence is meaningful.
const PACKAGES: PortalBillingPackages = {
  packages: [
    { id: 'pkgid_alpha', units: 500, prices_minor: { EUR: 999 } },
    { id: 'pkgid_beta', units: 1500, prices_minor: { EUR: 1499 } },
    { id: 'pkgid_gamma', units: 5000, prices_minor: { EUR: 3999 } },
    { id: 'pkgid_delta', units: 10000, prices_minor: { EUR: 6999 } },
  ],
  purchase: { open: true, reason: null },
}

const TERMS_REQUIRED: PortalBillingTerms = {
  terms_version: '2026-11-12',
  consent_required: true,
  consented_at: null,
}
const TERMS_AGREED: PortalBillingTerms = {
  terms_version: '2026-11-12',
  consent_required: false,
  consented_at: '2026-11-13T10:00:00Z',
}

const CHECKOUT = {
  provider: 'creem',
  checkout_id: 'ch_123',
  checkout_url: 'https://pay.example/checkout/ch_123',
  checkout_ref: '0b0e4b9a-6f0e-4c1e-9d55-5c3f1f2a7a10',
}

const PENDING: PortalBillingCheckoutState = {
  state: 'pending',
  package_id: 'pkgid_alpha',
  units: null,
  balance_after: null,
}
const CREDITED: PortalBillingCheckoutState = {
  state: 'credited',
  package_id: 'pkgid_alpha',
  units: 500,
  balance_after: 2030,
}

const EMPTY_STATEMENT: PortalBillingStatement = { items: [], next_cursor: null }

const LOAD_FAILED =
  'Не вдалося завантажити дані про юніти. Оновіть сторінку; якщо повториться, напишіть на support@pythoncourse.me.'
const ACTION_FAILED =
  'Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, напишіть на support@pythoncourse.me.'
const PROVIDER_UNAVAILABLE =
  'Сторінка оплати зараз не відкрилася. Спробуйте ще раз за хвилину; якщо повториться, напишіть на support@pythoncourse.me.'
const PURCHASE_NOT_OPEN =
  'Купівля юнітів у порталі ще не відкрита. З питаннями пишіть на support@pythoncourse.me.'
const RETURN_LINE =
  'Якщо ви прийшли сюди зі сторінки завдання, поверніться на ту вкладку: обраний файл чекає там.'

function line(
  kind: string,
  extra: Partial<PortalBillingStatementItem> = {},
): PortalBillingStatementItem {
  return {
    at: '2026-11-15T09:00:00Z',
    kind: kind as PortalBillingStatementItem['kind'],
    affects_balance: true,
    units: 10,
    balance_after: 1000,
    action: null,
    ...extra,
  }
}

function refusal(status: number, code: string): PortalApiError {
  return new PortalApiError(status, `portal api ${status}`, {
    detail: { code, details: 'English text for the logs' },
  })
}

function renderPage(path = `/${T}/billing`) {
  const router = createMemoryRouter(
    [
      { path: '/:tenantId/billing', element: <PortalBillingPage /> },
      { path: '/:tenantId/home', element: <div>MY COURSES</div> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

function stubAssign() {
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
  return assign
}

async function pressBuy(index = 0) {
  const buttons = await screen.findAllByRole('button', { name: 'Купити' })
  fireEvent.click(buttons[index]!)
}

/** The sentence is said, and its support address is a mailto link. */
function expectMailSentence(text: string, within_: HTMLElement = document.body) {
  const sentence = within(within_).getByText(
    (_, node) => node?.tagName === 'P' && node.textContent === text,
  )
  expect(within(sentence).getByRole('link', { name: 'support@pythoncourse.me' })).toHaveAttribute(
    'href',
    MAIL,
  )
}

function expectNoLetterToAdmin() {
  expect(
    screen.queryByRole('link', { name: 'Написати адміністраторові платформи' }),
  ).toBeNull()
  expect(document.body.textContent).not.toMatch(/адміністраторові/)
}

beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset()
  api.billingBalance.mockResolvedValue(FULL_BALANCE)
  api.billingPackages.mockResolvedValue(PACKAGES)
  api.billingStatement.mockResolvedValue(EMPTY_STATEMENT)
  api.billingTerms.mockResolvedValue(TERMS_AGREED)
  api.billingConsent.mockResolvedValue({
    terms_version: '2026-11-12',
    consented_at: '2026-11-15T10:00:00Z',
  })
  api.billingCheckout.mockResolvedValue(CHECKOUT)
  api.billingCheckoutState.mockResolvedValue(PENDING)
  api.billingOutlook.mockResolvedValue({
    reviews_left: null,
    warning: null,
    expiring_soon: null,
    paid_by: 'self',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('PortalBillingPage — heading', () => {
  it('names the page and says what a unit is to a student', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Юніти' })).toHaveClass(
      'page-title',
    )
    expect(
      screen.getByText(
        'Юніти оплачують автоматичну перевірку ваших робіт. Юніт — не гроші й не платіжний засіб, а обсяг послуги платформи.',
      ),
    ).toBeInTheDocument()
    await screen.findByText(`Доступно: 1 530 юнітів`)
  })

  it('has the portal header with the units item marked', async () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: 'Розділи порталу' })
    expect(await within(nav).findByRole('link', { name: 'Юніти' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

describe('PortalBillingPage — balance', () => {
  it('shows every line its condition calls for, never one about a difference', async () => {
    renderPage()
    expect(await screen.findByText(`Доступно: 1 530 юнітів`)).toBeInTheDocument()
    expect(
      screen.getByText('Зарезервовано для дій, які виконуються зараз: 120 юнітів.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Тимчасово недоступно: 80 юнітів — на час повернення оплати або спору щодо платежу.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Найближче згорання: 500 юнітів — 15 листопада 2026.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Використано понад залишок/)).toBeNull()
    expect(screen.queryByText('Юнітів поки немає.')).toBeNull()
    expect(screen.getByRole('link', { name: 'Як визначається вартість' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/pricing/',
    )
  })

  it('keeps an empty place for the reminders right under the main line', async () => {
    renderPage()
    const main = await screen.findByText(`Доступно: 1 530 юнітів`)
    const place = main.nextElementSibling
    expect(place).toHaveAttribute('data-billing-reminders')
    expect(place).toBeEmptyDOMElement()
  })

  it('says there are no units yet when everything is zero', async () => {
    api.billingBalance.mockResolvedValue(ZERO_BALANCE)
    renderPage()
    expect(await screen.findByText('Доступно: 0 юнітів')).toBeInTheDocument()
    expect(screen.getByText('Юнітів поки немає.')).toBeInTheDocument()
  })
})

describe('PortalBillingPage — packages', () => {
  it('shows the four packages as the site pricing page does, never their ids', async () => {
    renderPage()
    const section = await screen.findByRole('region', { name: 'Пакети' })
    const cards = await within(section).findAllByRole('listitem')
    expect(cards).toHaveLength(4)
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      '500 юнітів',
      `1${NB}500 юнітів`,
      `5${NB}000 юнітів`,
      `10${NB}000 юнітів`,
    ])
    for (const price of ['9,99 EUR', '14,99 EUR', '39,99 EUR', '69,99 EUR']) {
      expect(screen.getByText(price)).toBeInTheDocument()
    }
    for (const card of cards) {
      expect(card).toHaveClass('rounded-2xl', 'bg-sky-pale', 'border', 'border-sky', 'p-6')
    }
    expect(screen.getAllByRole('button', { name: 'Купити' })).toHaveLength(4)
    for (const { id } of PACKAGES.packages) {
      expect(document.body.innerHTML).not.toContain(id)
    }
  })

  it('tells about the price, the seller and links the terms and refunds', async () => {
    renderPage()
    expect(
      await screen.findByText(
        'Оплату приймає наш посередник-продавець; його назву показано на сторінці оплати. Після оплати ви повернетеся на цю сторінку.',
      ),
    ).toBeInTheDocument()
    for (const [name, href] of [
      ['Умови користування', 'https://pythoncourse.me/uk/terms/'],
      ['Повернення оплати', 'https://pythoncourse.me/uk/refunds/'],
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it.each(['payment_unavailable', 'purchase_not_open'] as const)(
    'purchase closed (%s): no Купити, the portal line with the support address',
    async (reason) => {
      api.billingPackages.mockResolvedValue({ ...PACKAGES, purchase: { open: false, reason } })
      renderPage()
      await screen.findByText(/Купівля юнітів у порталі ще не відкрита/)
      expectMailSentence(PURCHASE_NOT_OPEN)
      const section = screen.getByRole('region', { name: 'Пакети' })
      expect(within(section).getAllByRole('listitem')).toHaveLength(4)
      expect(screen.queryByRole('button', { name: 'Купити' })).toBeNull()
      expectNoLetterToAdmin()
    },
  )
})

describe('PortalBillingPage — purchase', () => {
  it('opens the payment page in the same tab when the terms are agreed', async () => {
    const assign = stubAssign()
    renderPage()
    await pressBuy(1)
    await waitFor(() => expect(assign).toHaveBeenCalledWith(CHECKOUT.checkout_url))
    expect(api.billingCheckout).toHaveBeenCalledWith('pkgid_beta')
    expect(api.billingConsent).not.toHaveBeenCalled()
  })

  it('sends one checkout for a double press and says it is opening', async () => {
    const assign = stubAssign()
    let answer: (value: typeof CHECKOUT) => void = () => {}
    api.billingCheckout.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    renderPage()
    const [first] = await screen.findAllByRole('button', { name: 'Купити' })
    fireEvent.click(first!)
    fireEvent.click(first!)
    const opening = await screen.findByRole('button', {
      name: 'Відкриваємо сторінку оплати…',
    })
    expect(opening).toBeDisabled()
    fireEvent.click(opening)
    await waitFor(() => expect(api.billingCheckout).toHaveBeenCalledTimes(1))
    expect(api.billingTerms).toHaveBeenCalledTimes(1)
    await act(async () => answer(CHECKOUT))
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('asks for the consent first, in the student text; without the checkbox it cannot be confirmed', async () => {
    api.billingTerms.mockResolvedValue(TERMS_REQUIRED)
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Перед першою купівлею підтвердьте:' }),
    ).toBeInTheDocument()
    const checkbox = within(dialog).getByRole('checkbox', {
      name: 'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
    })
    expect(checkbox).not.toBeChecked()
    for (const [name, href] of [
      ['умови користування', 'https://pythoncourse.me/uk/terms/'],
      ['правила повернення оплати', 'https://pythoncourse.me/uk/refunds/'],
    ]) {
      expect(within(dialog).getByRole('link', { name })).toHaveAttribute('href', href)
    }
    expect(
      within(dialog).getByText(
        'Коротко: юніт — не гроші й не платіжний засіб, його не можна обміняти на гроші, продати чи передати; пакет діє шість місяців; за невикористані юніти чинного пакета ви можете отримати повернення оплати.',
      ),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Якщо умови зміняться, ми попросимо вас підтвердити їх знову.'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    ).toBeDisabled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.billingConsent).not.toHaveBeenCalled()
    expect(api.billingCheckout).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button', { name: 'Купити' })[0]).toBeEnabled()
  })

  it('records the consent with the student fingerprint and the revision, then pays', async () => {
    const assign = stubAssign()
    api.billingTerms.mockResolvedValue(TERMS_REQUIRED)
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    await waitFor(() => expect(assign).toHaveBeenCalledWith(CHECKOUT.checkout_url))
    expect(api.billingConsent).toHaveBeenCalledWith('2026-11-12', SHA)
    expect(api.billingCheckout).toHaveBeenCalledWith('pkgid_alpha')
  })

  it('terms changed: reads them again, clears the checkbox and says so', async () => {
    stubAssign()
    api.billingTerms
      .mockResolvedValueOnce(TERMS_REQUIRED)
      .mockResolvedValue({ ...TERMS_REQUIRED, terms_version: '2026-12-01' })
    api.billingConsent.mockRejectedValueOnce(refusal(409, 'terms_changed'))
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    expect(
      await within(dialog).findByText(
        'Умови оновилися. Перегляньте чинну редакцію й підтвердьте її, щоб продовжити.',
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox')).not.toBeChecked()
    expect(api.billingCheckout).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    await waitFor(() => expect(api.billingCheckout).toHaveBeenCalledTimes(1))
    expect(api.billingConsent).toHaveBeenLastCalledWith('2026-12-01', SHA)
  })

  it('a checkout refused for want of consent opens the consent window', async () => {
    api.billingCheckout.mockRejectedValueOnce(refusal(409, 'terms_consent_required'))
    api.billingTerms
      .mockResolvedValueOnce(TERMS_AGREED)
      .mockResolvedValue({ ...TERMS_REQUIRED, terms_version: '2026-12-01' })
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    await waitFor(() => expect(api.billingConsent).toHaveBeenCalledWith('2026-12-01', SHA))
  })

  it('package not found: says so and loads the packages again', async () => {
    api.billingCheckout.mockRejectedValueOnce(refusal(404, 'package_not_found'))
    renderPage()
    await pressBuy()
    expect(
      await screen.findByText('Цей пакет зараз недоступний. Оберіть пакет ще раз.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(api.billingPackages).toHaveBeenCalledTimes(2))
    expectNoLetterToAdmin()
  })

  it('provider unavailable: says so, with the support address', async () => {
    api.billingCheckout.mockRejectedValueOnce(refusal(502, 'provider_unavailable'))
    renderPage()
    await pressBuy()
    await screen.findByRole('alert')
    expectMailSentence(PROVIDER_UNAVAILABLE)
    expectNoLetterToAdmin()
    expect(screen.getAllByRole('button', { name: 'Купити' })[0]).toBeEnabled()
  })

  it.each([
    [503, 'payment_unavailable'],
    [403, 'purchase_not_open'],
  ])('a checkout refused with %i %s closes the purchase', async (status, code) => {
    api.billingCheckout.mockRejectedValueOnce(refusal(status, code))
    renderPage()
    await pressBuy()
    await screen.findByText(/Купівля юнітів у порталі ще не відкрита/)
    expect(screen.queryByRole('button', { name: 'Купити' })).toBeNull()
  })

  it.each([
    ['another reason', refusal(404, 'provider_not_found')],
    ['no reason', new PortalApiError(500, 'portal api 500', { detail: 'Internal server error' })],
  ])('%s: the general sentence, with the support address', async (_, err) => {
    api.billingCheckout.mockRejectedValueOnce(err)
    renderPage()
    await pressBuy()
    await screen.findByRole('alert')
    expectMailSentence(ACTION_FAILED)
    expectNoLetterToAdmin()
  })

  it('no connection: asks to check it', async () => {
    api.billingTerms.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderPage()
    await pressBuy()
    expect(
      await screen.findByText(
        "Не вдалося з'єднатися з платформою. Перевірте з'єднання з інтернетом і спробуйте ще раз.",
      ),
    ).toBeInTheDocument()
    expect(api.billingCheckout).not.toHaveBeenCalled()
  })

  it('a consent that fails otherwise stays in the window with the general sentence', async () => {
    api.billingTerms.mockResolvedValue(TERMS_REQUIRED)
    api.billingConsent.mockRejectedValueOnce(new PortalApiError(500, 'portal api 500', null))
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    await within(dialog).findByRole('alert')
    expectMailSentence(ACTION_FAILED, dialog)
    expect(api.billingCheckout).not.toHaveBeenCalled()
  })
})

describe('PortalBillingPage — load failure', () => {
  it.each(['billingBalance', 'billingPackages', 'billingStatement'] as const)(
    '%s fails: the load sentence with the support address',
    async (request) => {
      api[request].mockRejectedValue(new PortalApiError(500, 'portal api 500', null))
      renderPage()
      await screen.findByRole('alert')
      expectMailSentence(LOAD_FAILED)
      expectNoLetterToAdmin()
    },
  )

  it('a session that ended (401) is the sign-in, not a load failure', async () => {
    api.billingBalance.mockRejectedValue(new PortalApiError(401, 'Portal session expired'))
    renderPage()
    await screen.findByRole('region', { name: 'Пакети' })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('PortalBillingPage — statement', () => {
  it('says what happened, a review charge as «Перевірка роботи»', async () => {
    api.billingStatement.mockResolvedValue({
      items: [
        line('purchase'),
        line('charge', { action: { kind: 'review', id: 'a3' } }),
        line('expired'),
        line('refund_hold', { affects_balance: false }),
      ],
      next_cursor: null,
    })
    renderPage()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[1]!.textContent)).toEqual([
      'Купівля пакета',
      'Перевірка роботи',
      'Строк пакета минув',
      'Утримано на час повернення оплати',
    ])
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Дата', 'Що відбулося', 'Юніти', 'Залишок після'])
  })

  it('signs a change of the balance; a hold is a plain, paler number', async () => {
    api.billingStatement.mockResolvedValue({
      items: [
        line('purchase', { units: 500, balance_after: 1500 }),
        line('charge', {
          units: -120,
          balance_after: 1000,
          action: { kind: 'review', id: 'a' },
        }),
        line('refund_hold', { affects_balance: false, units: 80, balance_after: 1000 }),
      ],
      next_cursor: null,
    })
    renderPage()
    const table = await screen.findByRole('table')
    const cells = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('cell'))
    expect(cells[0]![2]!.textContent).toBe('+500')
    expect(cells[0]![3]!.textContent).toBe(`1${NB}500 юнітів`)
    expect(cells[1]![2]!.textContent).toBe('−120')
    expect(cells[2]![2]!.textContent).toBe('80')
    expect(cells[2]![2]).toHaveClass('text-ink-light')
    expect(within(cells[2]![2]!).getByTitle('Залишок не змінився')).toBeInTheDocument()
  })

  it('"Показати ще" asks the next page by its cursor and adds it', async () => {
    api.billingStatement
      .mockResolvedValueOnce({ items: [line('purchase')], next_cursor: 'cursor-2' })
      .mockResolvedValueOnce({ items: [line('expired')], next_cursor: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показати ще' }))
    expect(await screen.findByText('Строк пакета минув')).toBeInTheDocument()
    expect(api.billingStatement).toHaveBeenNthCalledWith(1)
    expect(api.billingStatement).toHaveBeenNthCalledWith(2, 'cursor-2')
    expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull()
  })

  it('a next page that fails: the load sentence with the support address', async () => {
    api.billingStatement
      .mockResolvedValueOnce({ items: [line('purchase')], next_cursor: 'cursor-2' })
      .mockRejectedValueOnce(new PortalApiError(422, 'portal api 422', null))
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показати ще' }))
    await screen.findByRole('alert')
    expectMailSentence(LOAD_FAILED)
  })

  it('says there are no movements yet', async () => {
    renderPage()
    expect(await screen.findByText('Рухів юнітів ще немає.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('PortalBillingPage — return from the payment page', () => {
  it.each(['success', 'cancelled'])(
    'checkout=%s: the parameter leaves the address, nothing is asked',
    async (value) => {
      const router = renderPage(`/${T}/billing?checkout=${value}`)
      await screen.findByText(`Доступно: 1 530 юнітів`)
      await waitFor(() => expect(router.state.location.search).toBe(''))
      expect(router.state.historyAction).toBe('REPLACE')
      expect(api.billingCheckoutState).not.toHaveBeenCalled()
      expect(screen.queryByRole('status')).toBeNull()
    },
  )

  it('pending: "Зараховуємо…"', async () => {
    renderPage(`/${T}/billing?checkout=ref-1`)
    expect(await screen.findByText('Зараховуємо…')).toBeInTheDocument()
    expect(api.billingCheckoutState).toHaveBeenCalledWith('ref-1')
    expect(screen.getByRole('status')).toHaveClass('bg-canvas-dark')
    expect(screen.queryByRole('button', { name: 'Повернутись до роботи' })).toBeNull()
  })

  it('credited: the units, what is available now, and the way back to the work', async () => {
    api.billingCheckoutState.mockResolvedValue(CREDITED)
    api.billingBalance
      .mockResolvedValueOnce(FULL_BALANCE)
      .mockResolvedValue({ ...FULL_BALANCE, available: 2030 })
    renderPage(`/${T}/billing?checkout=ref-1`)
    expect(
      await screen.findByText(`Зараховано 500 юнітів. Тепер доступно 2 030 юнітів.`),
    ).toBeInTheDocument()
    expect(api.billingBalance).toHaveBeenCalledTimes(2)
    expect(api.billingStatement).toHaveBeenCalledTimes(2)
    const status = screen.getByRole('status')
    expect(status).toHaveClass('bg-forest-pale')
    expect(within(status).getByRole('button', { name: 'Повернутись до роботи' })).toBeInTheDocument()
    expect(within(status).getByRole('button', { name: 'Зрозуміло' })).toBeInTheDocument()
  })

  it('failed: the payment did not go through', async () => {
    api.billingCheckoutState.mockResolvedValue({ ...PENDING, state: 'failed' })
    renderPage(`/${T}/billing?checkout=ref-1`)
    expect(
      await screen.findByText(
        'Оплата не пройшла — юніти не зараховано. Можна обрати пакет ще раз.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('bg-coral-pale', 'text-ink')
    expect(screen.queryByRole('button', { name: 'Повернутись до роботи' })).toBeNull()
  })

  it('a checkout not found (404): no notice, and the parameter leaves the address', async () => {
    api.billingCheckoutState.mockRejectedValue(refusal(404, 'checkout_not_found'))
    const router = renderPage(`/${T}/billing?checkout=ref-1`)
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('"Зрозуміло" closes the notice and drops the parameter', async () => {
    api.billingCheckoutState.mockResolvedValue({ ...PENDING, state: 'failed' })
    const router = renderPage(`/${T}/billing?checkout=ref-1`)
    fireEvent.click(await screen.findByRole('button', { name: 'Зрозуміло' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('PortalBillingPage — "Повернутись до роботи"', () => {
  async function pressReturn() {
    api.billingCheckoutState.mockResolvedValue(CREDITED)
    renderPage(`/${T}/billing?checkout=ref-1`)
    fireEvent.click(await screen.findByRole('button', { name: 'Повернутись до роботи' }))
  }

  it('closes the tab', async () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    await pressReturn()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('a tab still in view after 300 ms: where the work waits, and «Мої курси»', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await pressReturn()
    expect(await screen.findByText(RETURN_LINE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Повернутись до роботи' })).toBeNull()
    const courses = within(screen.getByRole('status')).getByRole('link', { name: 'Мої курси' })
    expect(courses).toHaveAttribute('href', `/${T}/home`)
    fireEvent.click(courses)
    expect(await screen.findByText('MY COURSES')).toBeInTheDocument()
  })

  it('waits the 300 ms before it says so', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    api.billingCheckoutState.mockResolvedValue(CREDITED)
    renderPage(`/${T}/billing?checkout=ref-1`)
    const button = await screen.findByRole('button', { name: 'Повернутись до роботи' })
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.click(button)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299)
    })
    expect(screen.queryByText(RETURN_LINE)).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByText(RETURN_LINE)).toBeInTheDocument()
  })

  it('a tab that went out of view keeps the button', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    await pressReturn()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    })
    expect(screen.queryByText(RETURN_LINE)).toBeNull()
    expect(screen.getByRole('button', { name: 'Повернутись до роботи' })).toBeInTheDocument()
  })
})

describe('PortalBillingPage — waiting for the payment (mocked clock)', () => {
  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  const STILL_WAITING =
    "Оплата ще не надійшла. Якщо ви сплатили, юніти з'являться за кілька хвилин — сторінка перевіряє сама, її можна закрити."
  const NOT_YET = 'Оплата ще не надійшла.'
  const AFTER_TEN =
    "Якщо ви сплатили, а юніти не з'являться протягом години, напишіть на support@pythoncourse.me."

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  })

  it('after 1 min one line, after 10 min the short one and the support address; then stops', async () => {
    renderPage(`/${T}/billing?checkout=ref-1`)
    await advance(0)
    expect(screen.getByText('Зараховуємо…')).toBeInTheDocument()
    expect(api.billingCheckoutState).toHaveBeenCalledTimes(1)

    await advance(60_000) // one minute
    expect(api.billingCheckoutState).toHaveBeenCalledTimes(31)
    expect(screen.getByText(STILL_WAITING)).toBeInTheDocument()
    expect(screen.queryByText(NOT_YET)).toBeNull()

    await advance(540_000) // ten minutes
    expect(api.billingCheckoutState).toHaveBeenCalledTimes(85)
    expect(screen.queryByText(STILL_WAITING)).toBeNull()
    expect(screen.getByText(NOT_YET)).toBeInTheDocument()
    expectMailSentence(AFTER_TEN)
    expectNoLetterToAdmin()

    await advance(60_000)
    expect(api.billingCheckoutState).toHaveBeenCalledTimes(85)

    fireEvent.click(screen.getByRole('button', { name: 'Перевірити ще раз' }))
    await advance(0)
    expect(api.billingCheckoutState).toHaveBeenCalledTimes(86)
    expect(screen.getByText('Зараховуємо…')).toBeInTheDocument()
    expect(screen.queryByText(NOT_YET)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Перевірити ще раз' })).toBeNull()
  })
})

describe('PortalBillingPage — words', () => {
  const AVOIDED = [
    'напишіть нам',
    'тест',
    'тестов',
    'баланс',
    'поповнення',
    'різниц',
    'борг',
    'рахунок',
    'кошти',
    'кредит',
    'викладач',
    'creem',
    'paddle',
    'fastspring',
    'paypro',
    'macropay',
    'lemon',
    'provider',
  ]

  function expectNoAvoidedWords(state: string) {
    const text = document.body.textContent!.toLowerCase()
    for (const word of AVOIDED) {
      expect(text, `${state}: «${word}»`).not.toContain(word)
    }
  }

  it('says none of the avoided words: loaded, pending, consent open', async () => {
    api.billingStatement.mockResolvedValue({
      items: [
        'purchase',
        'admin_credit',
        'charge',
        'benefit_covered',
        'platform_covered',
        'expired',
        'refund',
        'refund_hold',
        'refund_released',
        'dispute_hold',
        'dispute_released',
        'dispute_lost',
        'unknown',
      ].map((kind) => line(kind)),
      next_cursor: 'more',
    })
    api.billingTerms.mockResolvedValue(TERMS_REQUIRED)
    renderPage(`/${T}/billing?checkout=ref-1`)
    await screen.findByText('Зараховуємо…')
    await screen.findByRole('table')
    await pressBuy()
    await screen.findByRole('dialog')
    expectNoAvoidedWords('loaded, pending, consent')
  })

  it.each([
    ['credited', CREDITED],
    ['failed', { ...PENDING, state: 'failed' as const }],
  ])('none in the %s notice', async (_, answer) => {
    api.billingCheckoutState.mockResolvedValue(answer)
    renderPage(`/${T}/billing?checkout=ref-1`)
    await screen.findByText(/Зараховано|не пройшла/)
    expectNoAvoidedWords(answer.state)
  })

  it('none when the purchase is closed', async () => {
    api.billingPackages.mockResolvedValue({
      ...PACKAGES,
      purchase: { open: false, reason: 'purchase_not_open' },
    })
    renderPage()
    await screen.findByText(/Купівля юнітів у порталі ще не відкрита/)
    expectNoAvoidedWords('closed')
  })

  it.each([
    ['provider_unavailable', refusal(502, 'provider_unavailable')],
    ['provider_not_found', refusal(404, 'provider_not_found')],
    ['package_not_found', refusal(404, 'package_not_found')],
    ['network', new TypeError('Failed to fetch')],
  ])('none after a refusal: %s', async (state, err) => {
    api.billingCheckout.mockRejectedValueOnce(err)
    renderPage()
    await pressBuy()
    await screen.findByRole('alert')
    expectNoAvoidedWords(state)
  })

  it('none when nothing loads', async () => {
    api.billingBalance.mockRejectedValue(new TypeError('Failed to fetch'))
    api.billingPackages.mockRejectedValue(new TypeError('Failed to fetch'))
    api.billingStatement.mockRejectedValue(new TypeError('Failed to fetch'))
    renderPage()
    await screen.findByRole('alert')
    expectNoAvoidedWords('load failure')
  })
})
