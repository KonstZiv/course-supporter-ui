import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { BillingSpendingResponse } from '../types/api'

// "Витрати ДЗ" in units, from the tasks of `GET /billing/spending` (BIL-E).
// The dollar report (`costApi`) is never asked. The current month is
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

import { HomeworkCostPage } from './HomeworkCostPage'

const NB = '\u00a0'

const IDLE: BillingSpendingResponse = {
  period: { from: '2026-11-01', to: '2026-11-30' },
  charging_enabled: false,
  totals: { billed_units: 0, covered_units: 0 },
  courses: [],
  unlinked: { billed_units: 0, covered_units: 0 },
}

const SPENT: BillingSpendingResponse = {
  ...IDLE,
  charging_enabled: true,
  totals: { billed_units: 1600, covered_units: 25 },
  courses: [
    {
      course_node_id: 'c1',
      title: 'Python для початківців',
      billed_units: 1300,
      covered_units: 25,
      reviews_units: 1100,
      processing_units: 0,
      preparation_units: 200,
      tasks: [
        {
          authored_document_id: 't1',
          title: 'Цикли',
          reviews: 12,
          billed_units: 1100,
          covered_units: 25,
        },
        {
          authored_document_id: 't2',
          title: 'Тест: змінні',
          reviews: 0,
          billed_units: 200,
          covered_units: 0,
        },
      ],
    },
    {
      // Only processing: no tasks, not on this page.
      course_node_id: 'c2',
      title: 'Без завдань',
      billed_units: 300,
      covered_units: 0,
      reviews_units: 0,
      processing_units: 300,
      preparation_units: 0,
      tasks: [],
    },
  ],
}

const IDLE_TEXT =
  "Тут будуть ваші витрати в юнітах, пов'язані з домашніми завданнями, — з розбивкою " +
  "по курсах і завданнях. Вони з'являться, щойно платформа почне списувати юніти. " +
  'Зараз юніти не списуються.'

describe('HomeworkCostPage — spending in units', () => {
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
    render(<HomeworkCostPage />)
    expect(await screen.findByText(IDLE_TEXT)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Витрати на перевірку ДЗ' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('courses with tasks; each opens into its tasks', async () => {
    api.billingSpending.mockResolvedValue(SPENT)
    render(<HomeworkCostPage />)
    const course = await screen.findByRole('button', { name: /Python для початківців/ })
    expect(course).toHaveAttribute('aria-expanded', 'false')
    expect(within(course).getByText('Витрачено: 1 300 юнітів')).toBeInTheDocument()
    expect(screen.queryByText('Без завдань')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()

    fireEvent.click(course)
    expect(course).toHaveAttribute('aria-expanded', 'true')
    const table = screen.getByRole('table')
    expect(
      within(table).getAllByRole('columnheader').map((h) => h.textContent),
    ).toEqual(['Завдання', 'Перевірок', 'Витрачено', 'Покрито'])
    const loops = within(table).getByRole('row', { name: /Цикли/ })
    expect(within(loops).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '12',
      `1${NB}100`,
      '25',
    ])
    expect(within(table).getByRole('rowheader', { name: 'Тест: змінні' })).toBeInTheDocument()
  })

  it('a month without homework spending says so', async () => {
    api.billingSpending.mockResolvedValue({
      ...SPENT,
      courses: [SPENT.courses[1]!],
    })
    render(<HomeworkCostPage />)
    expect(
      await screen.findByText('За цей місяць витрат на домашні завдання немає.'),
    ).toBeInTheDocument()
  })

  it('the month switch asks for the bounds of the month shown', async () => {
    api.billingSpending.mockResolvedValue(SPENT)
    render(<HomeworkCostPage />)
    await screen.findByRole('button', { name: /Python для початківців/ })
    expect(api.billingSpending).toHaveBeenCalledWith('2026-11-01', '2026-11-30')
    expect(screen.getByRole('button', { name: 'Наступний місяць' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Попередній місяць' }))
    await waitFor(() =>
      expect(api.billingSpending).toHaveBeenLastCalledWith('2026-10-01', '2026-10-31'),
    )
  })

  it('shows no money, and never asks the dollar report', async () => {
    api.billingSpending.mockResolvedValue(SPENT)
    const { container } = render(<HomeworkCostPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Python для початківців/ }))
    const text = container.textContent ?? ''
    expect(text).not.toContain('$')
    expect(text).not.toContain('USD')
    expect(text).not.toMatch(/долар/i)
    const { costApi } = await import('../api/cost')
    for (const call of Object.values(costApi)) expect(call).not.toHaveBeenCalled()
  })
})
