import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { BillingStudentsMoneyResponse } from '../types/api'

const api = vi.hoisted(() => ({ billingStudentsMoney: vi.fn() }))
vi.mock('../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/billing')>()),
  ...api,
}))

import { StudentsMoneyPage } from './StudentsMoneyPage'
import { LanguageProvider } from '../i18n/LanguageProvider'
import { loadPanelLanguage } from '../i18n/panelCatalogs'

const NB = '\u00a0'

const DATA: BillingStudentsMoneyResponse = {
  from: '2026-11-01',
  to: '2026-11-30',
  totals: {
    reviews: 5,
    units: 420,
    money: [
      { currency: 'EUR', amount_minor: 1250 },
      { currency: 'USD', amount_minor: 840 },
    ],
    gift_units: 70,
    excluded_test_reviews: 2,
  },
  courses: [
    {
      course_node_id: 'c1',
      title: 'Python для початківців',
      reviews: 3,
      units: 300,
      money: [
        { currency: 'EUR', amount_minor: 1250 },
        { currency: 'USD', amount_minor: 300 },
      ],
      gift_units: 50,
      students: [
        {
          student_id: 's1',
          display_name: 'Олена Коваль',
          deleted: false,
          reviews: 2,
          units: 200,
          money: [{ currency: 'EUR', amount_minor: 1250 }],
          gift_units: 0,
        },
        {
          student_id: 's2',
          display_name: null,
          deleted: true,
          reviews: 1,
          units: 100,
          money: [{ currency: 'USD', amount_minor: 300 }],
          gift_units: 50,
        },
      ],
    },
    {
      course_node_id: 'c2',
      title: 'Алгоритми',
      reviews: 2,
      units: 120,
      money: [{ currency: 'USD', amount_minor: 540 }],
      gift_units: 20,
      students: [
        {
          student_id: 's3',
          display_name: 'Іван Петренко',
          deleted: false,
          reviews: 2,
          units: 120,
          money: [{ currency: 'USD', amount_minor: 540 }],
          gift_units: 20,
        },
      ],
    },
  ],
  unlinked: { reviews: 0, units: 0, money: [], gift_units: 0 },
}

const EMPTY: BillingStudentsMoneyResponse = {
  from: '2026-11-01',
  to: '2026-11-30',
  totals: {
    reviews: 0,
    units: 0,
    money: [],
    gift_units: 0,
    excluded_test_reviews: 0,
  },
  courses: [],
  unlinked: { reviews: 0, units: 0, money: [], gift_units: 0 },
}

function renderPage(language?: 'uk' | 'en') {
  const tree = (
    <MemoryRouter initialEntries={['/students/money']}>
      <Routes>
        <Route path="/students/money" element={<StudentsMoneyPage />} />
      </Routes>
    </MemoryRouter>
  )
  return render(language ? <LanguageProvider language={language}>{tree}</LanguageProvider> : tree)
}

describe('StudentsMoneyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows summary, courses, two currencies, and expands a course to show students including deleted', async () => {
    api.billingStudentsMoney.mockResolvedValue(DATA)
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Гроші студентів за перевірки' }),
    ).toBeInTheDocument()
    expect(api.billingStudentsMoney).toHaveBeenCalledWith('2026-11-01', '2026-11-30')

    expect(
      screen.getByText(
        'За листопад 2026: 5 перевірок, 420 юнітів, 12,50 EUR, 8,40 USD.',
      ),
    ).toBeInTheDocument()

    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Курс', 'Перевірок', 'Юнітів', 'Гроші', 'Подаровані юніти'])

    // Server order preserved (c1 then c2).
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Python для початківців')
    expect(rows[2]).toHaveTextContent('Алгоритми')

    const firstCells = within(rows[1]!).getAllByRole('cell').map((c) => c.textContent)
    expect(firstCells).toEqual(['3', '300', `12,50${NB}EUR3,00${NB}USD`, '50'])

    // Students are hidden until the course row is clicked.
    expect(screen.queryByText('Олена Коваль')).toBeNull()
    expect(screen.queryByText('Видалений студент')).toBeNull()

    fireEvent.click(rows[1]!)

    const studentRows = within(table).getAllByRole('row')
    // Expanded subtable adds header + 2 student rows inside the container row.
    expect(screen.getByRole('columnheader', { name: 'Студент' })).toBeInTheDocument()
    expect(screen.getByText('Олена Коваль')).toBeInTheDocument()
    expect(screen.getByText('Видалений студент')).toBeInTheDocument()

    const olenaRow = screen.getByText('Олена Коваль').closest('tr')!
    expect(within(olenaRow).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '2',
      '200',
      `12,50${NB}EUR`,
      '0',
    ])

    const deletedRow = screen.getByText('Видалений студент').closest('tr')!
    expect(within(deletedRow).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      '1',
      '100',
      `3,00${NB}USD`,
      '50',
    ])

    expect(studentRows.length).toBeGreaterThan(3)
  })

  it('shows the month name in English in the summary and MonthPicker', async () => {
    await loadPanelLanguage('en')
    api.billingStudentsMoney.mockResolvedValue(DATA)
    renderPage('en')

    expect(
      await screen.findByText(/^November 2026: 5 reviews, 420 units,/),
    ).toBeInTheDocument()
    expect(screen.getByText('November 2026')).toBeInTheDocument()
  })

  it('shows empty-month copy when no reviews were paid by students', async () => {
    api.billingStudentsMoney.mockResolvedValue(EMPTY)
    renderPage()

    expect(
      await screen.findByText('За цей місяць студенти не оплачували перевірок.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows error copy on 500 and retries on click', async () => {
    api.billingStudentsMoney.mockRejectedValueOnce(new ApiError(500, 'API error 500', null))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не вдалося завантажити дані. Спробуйте ще раз.',
    )

    api.billingStudentsMoney.mockResolvedValueOnce(DATA)
    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще раз' }))
    expect(await screen.findByText('Python для початківців')).toBeInTheDocument()
  })

  it('switches months and requests the new from/to bounds', async () => {
    api.billingStudentsMoney.mockResolvedValue(EMPTY)
    renderPage()
    await screen.findByText('За цей місяць студенти не оплачували перевірок.')

    expect(screen.getByRole('button', { name: 'Наступний місяць' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Попередній місяць' }))
    await waitFor(() =>
      expect(api.billingStudentsMoney).toHaveBeenLastCalledWith('2026-10-01', '2026-10-31'),
    )
    expect(await screen.findByText('жовтень 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Наступний місяць' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Наступний місяць' }))
    await waitFor(() =>
      expect(api.billingStudentsMoney).toHaveBeenLastCalledWith('2026-11-01', '2026-11-30'),
    )
  })
})
