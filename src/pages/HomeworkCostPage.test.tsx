import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomeworkCostPage } from './HomeworkCostPage'

// The author sees no dollars: the page asks for nothing and says that the
// spending in units comes once the platform charges units.
vi.mock('../api/cost', () => ({
  costApi: {
    summary: vi.fn(),
    homework: vi.fn(),
    homeworkCourse: vi.fn(),
    homeworkTask: vi.fn(),
  },
}))

describe('HomeworkCostPage', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('explains that the spending in units comes later', () => {
    render(<HomeworkCostPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Витрати на перевірку ДЗ' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Тут будуть ваші витрати в юнітах, пов'язані з домашніми завданнями, — з розбивкою " +
          "по курсах і завданнях. Вони з'являться, щойно платформа почне списувати юніти. " +
          'Зараз юніти не списуються.',
      ),
    ).toBeInTheDocument()
  })

  it('shows no money and makes no request', async () => {
    const { container } = render(<HomeworkCostPage />)
    const text = container.textContent ?? ''
    expect(text).not.toContain('$')
    expect(text).not.toContain('USD')
    expect(container.querySelector('.lucide-dollar-sign')).toBeNull()

    const { costApi } = await import('../api/cost')
    for (const call of Object.values(costApi)) expect(call).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
