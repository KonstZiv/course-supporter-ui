import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { BillingSpendingResponse } from '../types/api'

// "Витрати" in units, from `GET /billing/spending` (BIL-E). The dollar report
// (`costApi`) is never asked. The clock is fixed: the current month is
// November 2026.
const api = vi.hoisted(() => ({ billingSpending: vi.fn() }))
vi.mock('../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/billing')>()),
  ...api,
}))
vi.mock('../api/cost', () => ({
  costApi: {
    summary: vi.fn(),
    homework: vi.fn(),
    homeworkCourse: vi.fn(),
    homeworkTask: vi.fn(),
  },
}))

import { CostPage } from './CostPage'

const NB = '\u00a0'

const IDLE: BillingSpendingResponse = {
  period: { from: '2026-11-01', to: '2026-11-30' },
  charging_enabled: false,
  totals: { billed_units: 0, covered_units: 0 },
  courses: [],
  unlinked: { billed_units: 0, covered_units: 0 },
}

const SPENT: BillingSpendingResponse = {
  period: { from: '2026-11-01', to: '2026-11-30' },
  charging_enabled: true,
  totals: { billed_units: 1820, covered_units: 40 },
  courses: [
    {
      course_node_id: 'c1',
      title: 'Python для початківців',
      billed_units: 1500,
      covered_units: 40,
      reviews_units: 900,
      processing_units: 450,
      preparation_units: 150,
      tasks: [],
    },
    {
      course_node_id: 'c2',
      title: null,
      billed_units: 300,
      covered_units: 0,
      reviews_units: 0,
      processing_units: 300,
      preparation_units: 0,
      tasks: [],
    },
  ],
  unlinked: { billed_units: 20, covered_units: 0 },
}

const EMPTY: BillingSpendingResponse = { ...IDLE, charging_enabled: true }

const IDLE_TEXT =
  'Тут будуть ваші витрати в юнітах на обробку матеріалів — з розбивкою по курсах. ' +
  "Вони з'являться, щойно платформа почне списувати юніти. Зараз юніти не списуються."

describe('CostPage — spending in units', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('charging off: the text it had before, no tables', async () => {
    api.billingSpending.mockResolvedValue(IDLE)
    render(<CostPage />)
    expect(await screen.findByText(IDLE_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Витрати' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Попередній місяць' })).toBeNull()
  })

  it('asks for the current month by its first and last day', async () => {
    api.billingSpending.mockResolvedValue(IDLE)
    render(<CostPage />)
    await screen.findByText(IDLE_TEXT)
    expect(api.billingSpending).toHaveBeenCalledTimes(1)
    expect(api.billingSpending).toHaveBeenCalledWith('2026-11-01', '2026-11-30')
  })

  it('the month, the totals and the table of courses', async () => {
    api.billingSpending.mockResolvedValue(SPENT)
    render(<CostPage />)
    expect(
      await screen.findByText('Витрачено за листопад 2026: 1 820 юнітів.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Покрито платформою або за домовленістю: 40 юнітів.'),
    ).toBeInTheDocument()
    expect(screen.getByText('листопад 2026')).toBeInTheDocument()

    const table = screen.getByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual([
      'Курс',
      'Обробка матеріалів',
      'Підготовка завдань',
      'Перевірки робіт',
      'Разом витрачено',
      'Покрито',
    ])
    const first = within(table).getByRole('row', { name: /Python для початківців/ })
    expect(
      within(first).getAllByRole('cell').map((c) => c.textContent),
    ).toEqual(['450', '150', '900', `1${NB}500`, '40'])
    expect(within(table).getByRole('rowheader', { name: 'Курс без назви' })).toBeInTheDocument()
    const unlinked = within(table).getByRole('row', { name: /Без курсу/ })
    expect(within(unlinked).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '—',
      '—',
      '—',
      '20',
      '0',
    ])
  })

  it('"Без курсу" only when something leads to no course; no covered line at 0', async () => {
    api.billingSpending.mockResolvedValue({
      ...SPENT,
      totals: { billed_units: 1800, covered_units: 0 },
      unlinked: { billed_units: 0, covered_units: 0 },
    })
    render(<CostPage />)
    await screen.findByRole('table')
    expect(screen.queryByText('Без курсу')).toBeNull()
    expect(screen.queryByText(/Покрито платформою/)).toBeNull()
  })

  it('a month without spending says so', async () => {
    api.billingSpending.mockResolvedValue(EMPTY)
    render(<CostPage />)
    expect(await screen.findByText('За цей місяць витрат немає.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('the month switch asks for the bounds of the month shown; no month after this one', async () => {
    api.billingSpending.mockResolvedValue(EMPTY)
    render(<CostPage />)
    await screen.findByText('За цей місяць витрат немає.')
    expect(screen.getByRole('button', { name: 'Наступний місяць' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Попередній місяць' }))
    await waitFor(() =>
      expect(api.billingSpending).toHaveBeenLastCalledWith('2026-10-01', '2026-10-31'),
    )
    expect(await screen.findByText('жовтень 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Наступний місяць' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Попередній місяць' }))
    await waitFor(() =>
      expect(api.billingSpending).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Наступний місяць' }))
    fireEvent.click(screen.getByRole('button', { name: 'Наступний місяць' }))
    await waitFor(() =>
      expect(api.billingSpending).toHaveBeenLastCalledWith('2026-11-01', '2026-11-30'),
    )
  })

  it('February of a leap year ends on the 29th', async () => {
    vi.setSystemTime(new Date('2028-03-10T12:00:00Z'))
    api.billingSpending.mockResolvedValue(EMPTY)
    render(<CostPage />)
    await screen.findByText('За цей місяць витрат немає.')
    fireEvent.click(screen.getByRole('button', { name: 'Попередній місяць' }))
    await waitFor(() =>
      expect(api.billingSpending).toHaveBeenLastCalledWith('2028-02-01', '2028-02-29'),
    )
  })

  it('a failed load says so', async () => {
    api.billingSpending.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<CostPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не вдалося завантажити дані про юніти.',
    )
  })

  it('shows no money, and never asks the dollar report', async () => {
    api.billingSpending.mockResolvedValue(SPENT)
    const { container } = render(<CostPage />)
    await screen.findByRole('table')
    const text = container.textContent ?? ''
    expect(text).not.toContain('$')
    expect(text).not.toContain('USD')
    expect(text).not.toMatch(/долар/i)
    const { costApi } = await import('../api/cost')
    for (const call of Object.values(costApi)) expect(call).not.toHaveBeenCalled()
  })
})
