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
  BillingBalanceResponse,
  BillingCheckoutStateResponse,
  BillingPackagesResponse,
  BillingStatementItem,
  BillingStatementResponse,
  BillingTermsResponse,
} from '../types/api'

// The requests are mocked; `billingReason` stays the real one, so a refusal
// is read by its code exactly as on the server's answer.
const api = vi.hoisted(() => ({
  getTerms: vi.fn(),
  postConsent: vi.fn(),
  getPackages: vi.fn(),
  postCheckout: vi.fn(),
  getCheckout: vi.fn(),
  getBalance: vi.fn(),
  getStatement: vi.fn(),
  billingOutlook: vi.fn(),
}))
vi.mock('../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/billing')>()),
  ...api,
}))

import { ApiError } from '../api/client'
import { BillingPage } from './BillingPage'

const NB = ' '
const SHA = '720b66e24bb1b00ee44ed066123e075b82a2c4c1f1ac18f1abeabf9914c63749'

const ZERO_BALANCE: BillingBalanceResponse = {
  balance: 0,
  reserved: 0,
  held: 0,
  available: 0,
  difference: 0,
  next_expiry: null,
}

const FULL_BALANCE: BillingBalanceResponse = {
  balance: 1730,
  reserved: 120,
  held: 80,
  available: 1530,
  difference: 30,
  next_expiry: { units: 500, expires_on: '2026-11-15' },
}

// Ids no screen text would ever contain, so their absence is meaningful.
const PACKAGES: BillingPackagesResponse = {
  packages: [
    { id: 'pkgid_alpha', units: 500, validity_months: 6, prices_minor: { EUR: 999 } },
    { id: 'pkgid_beta', units: 1500, validity_months: 6, prices_minor: { EUR: 1499 } },
    { id: 'pkgid_gamma', units: 5000, validity_months: 6, prices_minor: { EUR: 3999 } },
    { id: 'pkgid_delta', units: 10000, validity_months: 6, prices_minor: { EUR: 6999 } },
  ],
  purchase: { open: true, reason: null },
}

const TERMS_REQUIRED: BillingTermsResponse = {
  terms_version: '2026-11-12',
  consent_required: true,
  consented_at: null,
}
const TERMS_AGREED: BillingTermsResponse = {
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

const PENDING: BillingCheckoutStateResponse = {
  state: 'pending',
  package_id: 'pkgid_alpha',
  units: null,
  balance_after: null,
}

const EMPTY_STATEMENT: BillingStatementResponse = { items: [], next_cursor: null }

function line(
  kind: string,
  extra: Partial<BillingStatementItem> = {},
): BillingStatementItem {
  return {
    at: '2026-11-15T09:00:00Z',
    kind: kind as BillingStatementItem['kind'],
    affects_balance: true,
    units: 10,
    balance_after: 1000,
    action: null,
    ...extra,
  }
}

function refusal(status: number, code: string): ApiError {
  return new ApiError(status, `API error ${status}`, {
    detail: { code, details: 'English text for the logs' },
  })
}

function renderPage(path = '/billing') {
  const router = createMemoryRouter(
    [{ path: '/billing', element: <BillingPage /> }],
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

beforeEach(() => {
  for (const mock of Object.values(api)) mock.mockReset()
  api.billingOutlook.mockResolvedValue({
    days_left: null,
    warning: null,
    expiring_soon: null,
    held_reviews: { count: 0, oldest_at: null, missing_units: 0 },
  })
  api.getBalance.mockResolvedValue(FULL_BALANCE)
  api.getPackages.mockResolvedValue(PACKAGES)
  api.getStatement.mockResolvedValue(EMPTY_STATEMENT)
  api.getTerms.mockResolvedValue(TERMS_AGREED)
  api.postConsent.mockResolvedValue({
    terms_version: '2026-11-12',
    consented_at: '2026-11-15T10:00:00Z',
  })
  api.postCheckout.mockResolvedValue(CHECKOUT)
  api.getCheckout.mockResolvedValue(PENDING)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('BillingPage — heading', () => {
  it('names the page and says what a unit is', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Юніти' })).toHaveClass(
      'page-title',
    )
    expect(
      screen.getByText(
        'Юніти оплачують обробку матеріалів ваших курсів. Юніт — не гроші й не платіжний засіб, а обсяг послуги платформи.',
      ),
    ).toBeInTheDocument()
    await screen.findByText(`Доступно: 1 530 юнітів`)
  })
})

describe('BillingPage — balance', () => {
  it('shows every line its condition calls for', async () => {
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
      screen.getByText(
        'Використано понад залишок: 30 юнітів — це буде враховано першим під час наступної купівлі.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Найближче згорання: 500 юнітів — 15 листопада 2026.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Юнітів поки немає.')).toBeNull()

    const pricing = screen.getByRole('link', { name: 'Як визначається вартість' })
    expect(pricing).toHaveAttribute('href', 'https://pythoncourse.me/uk/pricing/')
    expect(pricing).toHaveAttribute('target', '_blank')
    expect(pricing).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('says there are no units yet when everything is zero', async () => {
    api.getBalance.mockResolvedValue(ZERO_BALANCE)
    renderPage()
    expect(await screen.findByText('Доступно: 0 юнітів')).toBeInTheDocument()
    expect(screen.getByText('Юнітів поки немає.')).toBeInTheDocument()
    expect(screen.queryByText(/Зарезервовано/)).toBeNull()
    expect(screen.queryByText(/Тимчасово недоступно/)).toBeNull()
    expect(screen.queryByText(/Використано понад залишок/)).toBeNull()
    expect(screen.queryByText(/Найближче згорання/)).toBeNull()
  })
})

describe('BillingPage — packages', () => {
  it('shows the four packages with names and prices, never their ids', async () => {
    renderPage()
    const cards = await screen.findAllByRole('listitem')
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
    expect(screen.getAllByText('Діє 6 місяців від дня купівлі.')).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: 'Купити' })).toHaveLength(4)
    for (const { id } of PACKAGES.packages) {
      expect(document.body.innerHTML).not.toContain(id)
    }
  })

  it('draws the cards as the site pricing page does: sky-pale, a sky border, a navy-dark price', async () => {
    renderPage()
    const cards = await screen.findAllByRole('listitem')
    for (const card of cards) {
      expect(card).toHaveClass('rounded-2xl', 'bg-sky-pale', 'border', 'border-sky', 'p-6')
      expect(card).not.toHaveClass('card')
      expect(card.className).not.toMatch(/shadow/)
    }
    const price = within(cards[0]!).getByText('9,99 EUR')
    expect(price).toHaveClass('font-display', 'font-semibold', 'text-[1.875rem]', 'text-navy-dark')
  })

  it('tells about the price, the seller and links the terms and refunds', async () => {
    renderPage()
    expect(
      await screen.findByText(
        'Ціни пакетів вказано в євро. Ціна вказана без податків, які можуть стягуватися додатково залежно від законів країни вашого податкового резидентства; остаточну суму показано на сторінці оплати перед оплатою.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Оплату приймає наш посередник-продавець; його назву показано на сторінці оплати. Після оплати ви повернетеся на цю сторінку.',
      ),
    ).toBeInTheDocument()
    for (const [name, href] of [
      ['Умови користування', 'https://pythoncourse.me/uk/terms/'],
      ['Повернення оплати', 'https://pythoncourse.me/uk/refunds/'],
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it.each(['payment_unavailable', 'purchase_not_open'] as const)(
    'purchase closed (%s): no Купити, the notice and a letter to the administrator',
    async (reason) => {
      api.getPackages.mockResolvedValue({ ...PACKAGES, purchase: { open: false, reason } })
      renderPage()
      expect(
        await screen.findByText(
          'Купівля юнітів у програмі ще не відкрита. Якщо юніти потрібні вам зараз, напишіть адміністраторові платформи.',
        ),
      ).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(4)
      expect(screen.queryByRole('button', { name: 'Купити' })).toBeNull()
      expect(
        screen.getByRole('link', { name: 'Написати адміністраторові платформи' }),
      ).toBeInTheDocument()
      // fallback="always": the address is shown without a click.
      expect(screen.getByText('support@pythoncourse.me')).toBeInTheDocument()
    },
  )
})

describe('BillingPage — purchase', () => {
  it('opens the payment page in the same tab when the terms are agreed', async () => {
    const assign = stubAssign()
    renderPage()
    await pressBuy(1)
    await waitFor(() => expect(assign).toHaveBeenCalledWith(CHECKOUT.checkout_url))
    expect(api.postCheckout).toHaveBeenCalledWith('pkgid_beta')
    expect(api.postConsent).not.toHaveBeenCalled()
  })

  it('sends one checkout for a double press and says it is opening', async () => {
    const assign = stubAssign()
    let answer: (value: typeof CHECKOUT) => void = () => {}
    api.postCheckout.mockReturnValue(
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
    await waitFor(() => expect(api.postCheckout).toHaveBeenCalledTimes(1))
    expect(api.getTerms).toHaveBeenCalledTimes(1)
    await act(async () => answer(CHECKOUT))
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('asks for the consent first; without the checkbox it cannot be confirmed', async () => {
    api.getTerms.mockResolvedValue(TERMS_REQUIRED)
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Перед купівлею юнітів підтвердьте:' }),
    ).toBeInTheDocument()
    const checkbox = within(dialog).getByRole('checkbox', {
      name: 'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
    })
    expect(checkbox).not.toBeChecked()
    for (const [name, href] of [
      ['умови користування', 'https://pythoncourse.me/uk/terms/'],
      ['правила повернення оплати', 'https://pythoncourse.me/uk/refunds/'],
    ]) {
      const link = within(dialog).getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
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
    expect(api.postCheckout).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(api.postConsent).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button', { name: 'Купити' })[0]).toBeEnabled()
  })

  it('records the consent with the fingerprint and the revision, then pays', async () => {
    const assign = stubAssign()
    api.getTerms.mockResolvedValue(TERMS_REQUIRED)
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    const confirm = within(dialog).getByRole('button', {
      name: 'Підтвердити й перейти до оплати',
    })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    await waitFor(() => expect(assign).toHaveBeenCalledWith(CHECKOUT.checkout_url))
    expect(api.postConsent).toHaveBeenCalledWith('2026-11-12', SHA)
    expect(api.postCheckout).toHaveBeenCalledWith('pkgid_alpha')
  })

  it('terms changed: reads them again, clears the checkbox and says so', async () => {
    stubAssign()
    api.getTerms
      .mockResolvedValueOnce(TERMS_REQUIRED)
      .mockResolvedValue({ ...TERMS_REQUIRED, terms_version: '2026-12-01' })
    api.postConsent.mockRejectedValueOnce(refusal(409, 'terms_changed'))
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
    expect(api.getTerms).toHaveBeenCalledTimes(2)
    expect(within(dialog).getByRole('checkbox')).not.toBeChecked()
    expect(api.postCheckout).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    await waitFor(() => expect(api.postCheckout).toHaveBeenCalledTimes(1))
    expect(api.postConsent).toHaveBeenLastCalledWith('2026-12-01', SHA)
  })

  it('a checkout refused for want of consent opens the consent window', async () => {
    api.postCheckout.mockRejectedValueOnce(refusal(409, 'terms_consent_required'))
    api.getTerms
      .mockResolvedValueOnce(TERMS_AGREED)
      .mockResolvedValue({ ...TERMS_REQUIRED, terms_version: '2026-12-01' })
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    await waitFor(() => expect(api.postConsent).toHaveBeenCalledWith('2026-12-01', SHA))
  })

  it('package not found: says so and loads the packages again', async () => {
    api.postCheckout.mockRejectedValueOnce(refusal(404, 'package_not_found'))
    renderPage()
    await pressBuy()
    expect(
      await screen.findByText('Цей пакет зараз недоступний. Оберіть пакет ще раз.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(api.getPackages).toHaveBeenCalledTimes(2))
    expect(
      screen.queryByRole('link', { name: 'Написати адміністраторові платформи' }),
    ).toBeNull()
  })

  it('provider unavailable: says so, with a letter to the administrator', async () => {
    api.postCheckout.mockRejectedValueOnce(refusal(502, 'provider_unavailable'))
    renderPage()
    await pressBuy()
    const text =
      'Сторінка оплати зараз не відкрилася. Спробуйте ще раз за хвилину; якщо повториться, напишіть нам.'
    expect(await screen.findByText(text)).toBeInTheDocument()
    const letter = screen.getByRole('link', { name: 'Написати адміністраторові платформи' })
    expect(decodeURIComponent(letter.getAttribute('href')!)).toContain(text)
    expect(screen.getAllByRole('button', { name: 'Купити' })[0]).toBeEnabled()
  })

  it.each([
    [503, 'payment_unavailable'],
    [403, 'purchase_not_open'],
  ])('a checkout refused with %i %s closes the purchase', async (status, code) => {
    api.postCheckout.mockRejectedValueOnce(refusal(status, code))
    renderPage()
    await pressBuy()
    expect(
      await screen.findByText(
        'Купівля юнітів у програмі ще не відкрита. Якщо юніти потрібні вам зараз, напишіть адміністраторові платформи.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Купити' })).toBeNull()
  })

  it.each([
    ['another reason', refusal(404, 'provider_not_found')],
    ['no reason', new ApiError(500, 'API error 500', { detail: 'Internal server error' })],
  ])('%s: the general sentence, with a letter', async (_, err) => {
    api.postCheckout.mockRejectedValueOnce(err)
    renderPage()
    await pressBuy()
    const text =
      'Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, напишіть нам.'
    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Написати адміністраторові платформи' }),
    ).toBeInTheDocument()
  })

  it('no connection: asks to check it', async () => {
    api.getTerms.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    renderPage()
    await pressBuy()
    expect(
      await screen.findByText(
        "Не вдалося з'єднатися з платформою. Перевірте з'єднання з інтернетом і спробуйте ще раз.",
      ),
    ).toBeInTheDocument()
    expect(api.postCheckout).not.toHaveBeenCalled()
  })

  it('a consent that fails otherwise stays in the window with the general sentence', async () => {
    api.getTerms.mockResolvedValue(TERMS_REQUIRED)
    api.postConsent.mockRejectedValueOnce(new ApiError(500, 'API error 500', null))
    renderPage()
    await pressBuy()
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Підтвердити й перейти до оплати' }),
    )
    expect(
      await within(dialog).findByText(
        'Не вдалося виконати дію. Спробуйте ще раз; якщо повториться, напишіть нам.',
      ),
    ).toBeInTheDocument()
    expect(api.postCheckout).not.toHaveBeenCalled()
  })
})

describe('BillingPage — load failure', () => {
  it.each(['getBalance', 'getPackages', 'getStatement'] as const)(
    '%s fails: the load sentence, with a letter after a click',
    async (request) => {
      api[request].mockRejectedValue(new ApiError(500, 'API error 500', null))
      renderPage()
      const text =
        'Не вдалося завантажити дані про юніти. Оновіть сторінку; якщо повториться, напишіть нам.'
      expect(await screen.findByText(text)).toBeInTheDocument()
      const letter = screen.getByRole('link', {
        name: 'Написати адміністраторові платформи',
      })
      expect(decodeURIComponent(letter.getAttribute('href')!)).toContain(text)
      // fallback="after-click": the address waits for the click.
      expect(screen.queryByText('support@pythoncourse.me')).toBeNull()
    },
  )
})

describe('BillingPage — statement', () => {
  const KINDS: [BillingStatementItem, string][] = [
    [line('purchase'), 'Купівля пакета'],
    [line('admin_credit'), 'Нараховано адміністратором платформи'],
    [line('charge', { action: { kind: 'processing', id: 'a1' } }), 'Обробка матеріалів'],
    [
      line('charge', { action: { kind: 'task_preparation', id: 'a2' } }),
      'Підготовка завдання до оцінювання',
    ],
    [line('charge', { action: { kind: 'review', id: 'a3' } }), 'Перевірка роботи'],
    [line('charge', { action: { kind: 'something_new', id: 'a4' } }), 'Списання за дію'],
    [line('charge'), 'Списання за дію'],
    [line('benefit_covered'), 'Оплачено платформою за домовленістю'],
    [line('platform_covered'), 'Решту вартості взяла на себе платформа'],
    [line('expired'), 'Строк пакета минув'],
    [line('refund'), 'Повернення оплати'],
    [line('refund_hold'), 'Утримано на час повернення оплати'],
    [line('refund_released'), 'Утримання на час повернення оплати знято'],
    [line('dispute_hold'), 'Заблоковано до завершення спору щодо платежу'],
    [line('dispute_released'), 'Знову доступні після спору щодо платежу'],
    [line('dispute_lost'), 'Анульовано за підсумком спору щодо платежу'],
    [line('difference_arisen'), 'Використано понад залишок'],
    [line('difference_repaid'), 'Враховано використане понад залишок'],
    [line('difference_annulled'), 'Використане понад залишок взяла на себе платформа'],
    [line('kind_from_the_future'), 'Інший рух юнітів'],
  ]

  it('says what happened for every kind, an unknown one as another movement', async () => {
    api.getStatement.mockResolvedValue({ items: KINDS.map(([l]) => l), next_cursor: null })
    renderPage()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => within(r).getAllByRole('cell')[1]!.textContent)).toEqual(
      KINDS.map(([, text]) => text),
    )
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Дата', 'Що відбулося', 'Юніти', 'Залишок після'])
    expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull()
  })

  it('signs a change of the balance; a hold is a plain, paler number', async () => {
    api.getStatement.mockResolvedValue({
      items: [
        line('purchase', { units: 500, balance_after: 1500 }),
        line('charge', { units: -120, balance_after: 1000 }),
        line('refund_hold', { affects_balance: false, units: 80, balance_after: 1000 }),
      ],
      next_cursor: null,
    })
    renderPage()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    const cells = rows.map((r) => within(r).getAllByRole('cell'))
    expect(cells[0]![0]!.textContent).toBe('15 листопада 2026')
    expect(cells[0]![2]!.textContent).toBe('+500')
    expect(cells[0]![3]!.textContent).toBe(`1${NB}500 юнітів`)
    expect(cells[1]![2]!.textContent).toBe('−120')
    expect(cells[2]![2]!.textContent).toBe('80')
    expect(cells[2]![2]).toHaveClass('text-ink-light')
    expect(within(cells[2]![2]!).getByTitle('Залишок не змінився')).toBeInTheDocument()
  })

  it('"Показати ще" asks the next page by its cursor and adds it', async () => {
    api.getStatement
      .mockResolvedValueOnce({ items: [line('purchase')], next_cursor: 'cursor-2' })
      .mockResolvedValueOnce({ items: [line('expired')], next_cursor: null })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Показати ще' }))
    expect(await screen.findByText('Строк пакета минув')).toBeInTheDocument()
    expect(api.getStatement).toHaveBeenNthCalledWith(1)
    expect(api.getStatement).toHaveBeenNthCalledWith(2, 'cursor-2')
    expect(screen.getByText('Купівля пакета')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Показати ще' })).toBeNull()
  })

  it('says there are no movements yet', async () => {
    renderPage()
    expect(await screen.findByText('Рухів юнітів ще немає.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('BillingPage — return from the payment page', () => {
  it.each(['success', 'cancelled'])(
    'checkout=%s: the parameter leaves the address, nothing is asked',
    async (value) => {
      const router = renderPage(`/billing?checkout=${value}`)
      await screen.findByText(`Доступно: 1 530 юнітів`)
      await waitFor(() => expect(router.state.location.search).toBe(''))
      expect(router.state.historyAction).toBe('REPLACE')
      expect(api.getCheckout).not.toHaveBeenCalled()
      expect(screen.queryByRole('status')).toBeNull()
    },
  )

  it('pending: "Зараховуємо…"', async () => {
    renderPage('/billing?checkout=ref-1')
    expect(await screen.findByText('Зараховуємо…')).toBeInTheDocument()
    expect(api.getCheckout).toHaveBeenCalledWith('ref-1')
    expect(screen.getByRole('status')).toHaveClass('bg-canvas-dark')
  })

  it('credited: the units and what is available now; balance and statement read again', async () => {
    api.getCheckout.mockResolvedValue({
      state: 'credited',
      package_id: 'pkgid_alpha',
      units: 500,
      balance_after: 2030,
    })
    api.getBalance
      .mockResolvedValueOnce(FULL_BALANCE)
      .mockResolvedValue({ ...FULL_BALANCE, available: 2030 })
    renderPage('/billing?checkout=ref-1')
    expect(
      await screen.findByText(`Зараховано 500 юнітів. Тепер доступно 2 030 юнітів.`),
    ).toBeInTheDocument()
    expect(api.getBalance).toHaveBeenCalledTimes(2)
    expect(api.getStatement).toHaveBeenCalledTimes(2)
    expect(screen.getByText(`Доступно: 2 030 юнітів`)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('bg-forest-pale')
  })

  it('failed: the payment did not go through', async () => {
    api.getCheckout.mockResolvedValue({ ...PENDING, state: 'failed' })
    renderPage('/billing?checkout=ref-1')
    expect(
      await screen.findByText(
        'Оплата не пройшла — юніти не зараховано. Можна обрати пакет ще раз.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveClass('bg-coral-pale', 'text-ink')
  })

  it('a checkout not found: no notice, and the parameter leaves the address', async () => {
    api.getCheckout.mockRejectedValue(refusal(404, 'checkout_not_found'))
    const router = renderPage('/billing?checkout=ref-1')
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByText('Зараховуємо…')).toBeNull()
  })

  it('"Зрозуміло" closes the notice and drops the parameter', async () => {
    api.getCheckout.mockResolvedValue({ ...PENDING, state: 'failed' })
    const router = renderPage('/billing?checkout=ref-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Зрозуміло' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(router.state.historyAction).toBe('REPLACE')
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('BillingPage — waiting for the payment (mocked clock)', () => {
  const advance = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  const STILL_WAITING =
    "Оплата ще не надійшла. Якщо ви сплатили, юніти з'являться за кілька хвилин — сторінка перевіряє сама, її можна закрити."
  const NOT_YET = 'Оплата ще не надійшла.'
  const AFTER_TEN =
    "Якщо ви сплатили, а юніти не з'являться протягом години, напишіть адміністраторові платформи."

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  })

  it('asks every 2 s, then every 10 s; after 1 min one line, after 10 min another in its place; then stops', async () => {
    renderPage('/billing?checkout=ref-1')
    await advance(0)
    expect(screen.getByText('Зараховуємо…')).toBeInTheDocument()
    expect(api.getCheckout).toHaveBeenCalledTimes(1)

    await advance(58_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(30)
    expect(screen.queryByText(STILL_WAITING)).toBeNull()

    await advance(2_000) // one minute
    expect(api.getCheckout).toHaveBeenCalledTimes(31)
    expect(screen.getByText(STILL_WAITING)).toBeInTheDocument()
    expect(screen.queryByText(AFTER_TEN)).toBeNull()

    await advance(10_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(32)

    await advance(530_000) // ten minutes
    expect(api.getCheckout).toHaveBeenCalledTimes(85)
    // The first-minute line gives way to the short one: the page no longer asks.
    expect(screen.queryByText(STILL_WAITING)).toBeNull()
    expect(screen.getByText(NOT_YET)).toBeInTheDocument()
    expect(screen.getByText(AFTER_TEN)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Написати адміністраторові платформи' }),
    ).toBeInTheDocument()
    expect(screen.getByText('support@pythoncourse.me')).toBeInTheDocument()

    await advance(60_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(85)

    fireEvent.click(screen.getByRole('button', { name: 'Перевірити ще раз' }))
    await advance(0)
    expect(api.getCheckout).toHaveBeenCalledTimes(86)
    expect(screen.getByText('Зараховуємо…')).toBeInTheDocument()
    expect(screen.queryByText(STILL_WAITING)).toBeNull()
    expect(screen.queryByText(NOT_YET)).toBeNull()
    expect(screen.queryByText(AFTER_TEN)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Перевірити ще раз' })).toBeNull()

    await advance(2_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(87)
  })

  it('"Перевірити ще раз" starts the schedule over: the first-minute line, then the ten-minute one', async () => {
    renderPage('/billing?checkout=ref-1')
    await advance(0)
    await advance(600_000)
    expect(screen.getByText(NOT_YET)).toBeInTheDocument()
    expect(api.getCheckout).toHaveBeenCalledTimes(85)

    fireEvent.click(screen.getByRole('button', { name: 'Перевірити ще раз' }))
    await advance(0)
    expect(screen.getByText('Зараховуємо…')).toBeInTheDocument()
    expect(screen.queryByText(NOT_YET)).toBeNull()

    await advance(58_000)
    expect(screen.queryByText(STILL_WAITING)).toBeNull()
    await advance(2_000) // a minute since the retry
    expect(screen.getByText(STILL_WAITING)).toBeInTheDocument()
    expect(screen.queryByText(NOT_YET)).toBeNull()
    expect(screen.queryByText(AFTER_TEN)).toBeNull()
    expect(api.getCheckout).toHaveBeenCalledTimes(85 + 31)

    await advance(540_000) // ten minutes since the retry
    expect(screen.queryByText(STILL_WAITING)).toBeNull()
    expect(screen.getByText(NOT_YET)).toBeInTheDocument()
    expect(screen.getByText(AFTER_TEN)).toBeInTheDocument()
    expect(api.getCheckout).toHaveBeenCalledTimes(85 + 85)
    await advance(60_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(85 + 85)
  })

  it('stops asking once credited', async () => {
    api.getCheckout
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValue({ ...PENDING, state: 'credited', units: 500, balance_after: 2030 })
    renderPage('/billing?checkout=ref-1')
    await advance(0)
    await advance(2_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/^Зараховано 500 юнітів\./)).toBeInTheDocument()
    await advance(60_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(2)
  })

  it('keeps asking through a failed ask', async () => {
    api.getCheckout
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(PENDING)
    renderPage('/billing?checkout=ref-1')
    await advance(0)
    expect(screen.getByText('Зараховуємо…')).toBeInTheDocument()
    await advance(2_000)
    expect(api.getCheckout).toHaveBeenCalledTimes(2)
  })
})

describe('BillingPage — words', () => {
  const AVOIDED = [
    'тест',
    'тестов',
    'баланс',
    'поповнення',
    'різниц',
    'борг',
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

  it('says none of the avoided words in any state', async () => {
    api.getStatement.mockResolvedValue({
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
        'difference_arisen',
        'difference_repaid',
        'difference_annulled',
        'unknown',
      ].map((kind) => line(kind)),
      next_cursor: 'more',
    })
    // Everything loaded, a payment pending, the consent window open.
    api.getTerms.mockResolvedValue(TERMS_REQUIRED)
    renderPage('/billing?checkout=ref-1')
    await screen.findByText('Зараховуємо…')
    await screen.findByRole('table')
    await pressBuy()
    await screen.findByRole('dialog')
    expectNoAvoidedWords('loaded, pending, consent')
  })

  it.each([
    ['credited', { ...PENDING, state: 'credited', units: 500, balance_after: 2030 }],
    ['failed', { ...PENDING, state: 'failed' }],
  ])('none in the %s notice', async (_, answer) => {
    api.getCheckout.mockResolvedValue(answer)
    renderPage('/billing?checkout=ref-1')
    await screen.findByRole('status')
    await screen.findByText(/Зараховано|не пройшла/)
    expectNoAvoidedWords(String(answer.state))
  })

  it.each([
    ['closed', { ...PACKAGES, purchase: { open: false, reason: 'purchase_not_open' } }],
  ])('none when the purchase is %s', async (_, packages) => {
    api.getPackages.mockResolvedValue(packages)
    renderPage()
    await screen.findByText(/Купівля юнітів у програмі ще не відкрита/)
    expectNoAvoidedWords('closed')
  })

  it.each([
    ['provider_unavailable', refusal(502, 'provider_unavailable')],
    ['provider_not_found', refusal(404, 'provider_not_found')],
    ['package_not_found', refusal(404, 'package_not_found')],
    ['network', new TypeError('Failed to fetch')],
  ])('none after a refusal: %s', async (_, err) => {
    api.postCheckout.mockRejectedValueOnce(err)
    renderPage()
    await pressBuy()
    await screen.findByRole('alert')
    expectNoAvoidedWords(String(_))
  })

  it('none when nothing loads', async () => {
    api.getBalance.mockRejectedValue(new TypeError('Failed to fetch'))
    api.getPackages.mockRejectedValue(new TypeError('Failed to fetch'))
    api.getStatement.mockRejectedValue(new TypeError('Failed to fetch'))
    renderPage()
    await screen.findByRole('alert')
    expectNoAvoidedWords('load failure')
  })
})

describe('BillingPage — "Повернутись до роботи" (5.6)', () => {
  const RETURN_LINE =
    'Якщо ви прийшли сюди з іншої сторінки програми, поверніться на ту вкладку й запустіть дію ще раз.'
  const CREDITED: BillingCheckoutStateResponse = {
    state: 'credited',
    package_id: 'pkgid_alpha',
    units: 500,
    balance_after: 2030,
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  async function pressReturn() {
    api.getCheckout.mockResolvedValue(CREDITED)
    renderPage('/billing?checkout=ref-1')
    fireEvent.click(await screen.findByRole('button', { name: 'Повернутись до роботи' }))
  }

  it('beside "Зрозуміло" once credited', async () => {
    api.getCheckout.mockResolvedValue(CREDITED)
    renderPage('/billing?checkout=ref-1')
    const status = await screen.findByRole('status')
    expect(
      await within(status).findByRole('button', { name: 'Повернутись до роботи' }),
    ).toBeInTheDocument()
    expect(within(status).getByRole('button', { name: 'Зрозуміло' })).toBeInTheDocument()
  })

  it('no way back while the payment is pending', async () => {
    renderPage('/billing?checkout=ref-1')
    await screen.findByText('Зараховуємо…')
    expect(screen.queryByRole('button', { name: 'Повернутись до роботи' })).toBeNull()
  })

  it('credited: the outlook is read again (reminders, students’ reviews waiting)', async () => {
    api.getCheckout.mockResolvedValue(CREDITED)
    renderPage('/billing?checkout=ref-1')
    await screen.findByRole('button', { name: 'Повернутись до роботи' })
    expect(api.billingOutlook).toHaveBeenCalledTimes(1)
  })

  it('closes the tab', async () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    await pressReturn()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('a tab still in view after 300 ms: where the action waits, and «Мої курси»', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await pressReturn()
    expect(await screen.findByText(RETURN_LINE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Повернутись до роботи' })).toBeNull()
    expect(
      within(screen.getByRole('status')).getByRole('link', { name: 'Мої курси' }),
    ).toHaveAttribute('href', '/')
  })

  it('waits the 300 ms before it says so', async () => {
    vi.spyOn(window, 'close').mockImplementation(() => {})
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    api.getCheckout.mockResolvedValue(CREDITED)
    renderPage('/billing?checkout=ref-1')
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
