import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ApiError } from '../../api/client'
import { enrollmentLinkApi } from '../../api/enrollment-link'
import { EnrollmentLinkControl } from './EnrollmentLinkControl'
import enPanel from '../../i18n/catalogs/en/panel.json'
import ukPanel from '../../i18n/catalogs/uk/panel.json'

vi.mock('../../api/enrollment-link', () => ({
  enrollmentLinkApi: {
    get: vi.fn(),
    open: vi.fn(),
    rotate: vi.fn(),
    close: vi.fn(),
  },
}))

const CLOSED = { open: false, key: null, url: null }
const URL_1 = 'https://campus.example/t-1/join/key-1'
const URL_2 = 'https://campus.example/t-1/join/key-2'
const OPEN_1 = { open: true, key: 'key-1', url: URL_1 }
const OPEN_2 = { open: true, key: 'key-2', url: URL_2 }

const api = vi.mocked(enrollmentLinkApi)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('EnrollmentLinkControl', () => {
  it('walks closed → open → copy → rotate (confirmed) → close (confirmed)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    api.get.mockResolvedValue(CLOSED)
    api.open.mockResolvedValue(OPEN_1)
    api.rotate.mockResolvedValue(OPEN_2)
    api.close.mockResolvedValue(CLOSED)

    render(<EnrollmentLinkControl courseId="c-1" />)
    // The button carries the state of the link.
    const button = await screen.findByRole('button', { name: /Запис за посиланням/ })
    await within(button).findByText('закрито')
    fireEvent.click(button)

    // Closed: the explanation and the one action.
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Студенти зможуть самі записатися/)).toBeInTheDocument()
    expect(within(dialog).getByText(/лише з підтвердженою поштою/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Відкрити запис' }))

    // Open: the link, read-only, and the copy button.
    const field = await within(dialog).findByLabelText('Посилання на курс')
    expect(field).toHaveValue(URL_1)
    expect(field).toHaveAttribute('readonly')
    expect(api.open).toHaveBeenCalledWith('c-1')
    expect(within(button).getByText('відкрито')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Копіювати' }))
    await within(dialog).findByRole('button', { name: 'Скопійовано!' })
    expect(writeText).toHaveBeenCalledWith(URL_1)

    // Rotate asks first; cancel leaves the link as it is.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Випустити нове посилання' }))
    expect(
      within(dialog).getByText(
        'Старе посилання перестане діяти. Ті, хто вже записався, залишаться на курсі.',
      ),
    ).toBeInTheDocument()
    expect(api.rotate).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))
    expect(within(dialog).getByLabelText('Посилання на курс')).toHaveValue(URL_1)
    expect(api.rotate).not.toHaveBeenCalled()

    // Rotate, confirmed: the new link replaces the old.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Випустити нове посилання' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Випустити' }))
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Посилання на курс')).toHaveValue(URL_2),
    )
    expect(api.rotate).toHaveBeenCalledWith('c-1')

    // Close asks first, then closes; the window offers to open again.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Закрити запис' }))
    expect(
      within(dialog).getByText(
        'Нові студенти не зможуть записатися. Ті, хто вже записався, залишаться на курсі.',
      ),
    ).toBeInTheDocument()
    expect(api.close).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Закрити' }))
    await within(dialog).findByRole('button', { name: 'Відкрити запис' })
    expect(api.close).toHaveBeenCalledWith('c-1')
    expect(within(button).getByText('закрито')).toBeInTheDocument()
  })

  it('shows the open link at once when the course is already open', async () => {
    api.get.mockResolvedValue(OPEN_1)
    render(<EnrollmentLinkControl courseId="c-1" />)
    const button = await screen.findByRole('button', { name: /Запис за посиланням/ })
    await within(button).findByText('відкрито')
    fireEvent.click(button)
    expect(await screen.findByLabelText('Посилання на курс')).toHaveValue(URL_1)
  })

  it('says so when the clipboard is not available and keeps the link to copy by hand', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    api.get.mockResolvedValue(OPEN_1)
    render(<EnrollmentLinkControl courseId="c-1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Запис за посиланням/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Копіювати' }))
    expect(await screen.findByText(/Не вдалося скопіювати автоматично/)).toBeInTheDocument()
    expect(screen.getByLabelText('Посилання на курс')).toHaveValue(URL_1)
  })

  it('a network failure on an action is shown and the state does not change', async () => {
    api.get.mockResolvedValue(CLOSED)
    api.open.mockRejectedValue(new TypeError('Failed to fetch'))
    render(<EnrollmentLinkControl courseId="c-1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Запис за посиланням/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Відкрити запис' }))
    expect(
      await screen.findByText('Не вдалося зв’язатися із сервером. Спробуйте ще раз.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Відкрити запис' })).toBeInTheDocument()
  })

  it('a 404 says the course was not found', async () => {
    api.get.mockResolvedValue(OPEN_1)
    api.rotate.mockRejectedValue(new ApiError(404, 'Not Found', { detail: 'Course not found' }))
    render(<EnrollmentLinkControl courseId="c-1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Запис за посиланням/ }))
    await screen.findByLabelText('Посилання на курс')
    fireEvent.click(screen.getByRole('button', { name: 'Випустити нове посилання' }))
    fireEvent.click(screen.getByRole('button', { name: 'Випустити' }))
    expect(await screen.findByText(/Курс не знайдено/)).toBeInTheDocument()
  })

  it('a failed first read has no state on the button; opening the window reads again, with retry', async () => {
    api.get.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    api.get.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    api.get.mockResolvedValueOnce(CLOSED)
    render(<EnrollmentLinkControl courseId="c-1" />)
    const button = await screen.findByRole('button', { name: /Запис за посиланням/ })
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1))
    expect(within(button).queryByText('закрито')).toBeNull()
    fireEvent.click(button)
    expect(await screen.findByText(/Не вдалося зв’язатися із сервером/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Повторити' }))
    expect(await screen.findByRole('button', { name: 'Відкрити запис' })).toBeInTheDocument()
  })

  // The English panel catalog is not wired into `translate` yet, so the words
  // are checked in the catalog itself; catalogEn.test.ts keeps the keys paired.
  it('has the English words of the window, with no Cyrillic', () => {
    const keys = Object.keys(ukPanel).filter(
      (key) => key.startsWith('panel.enrollmentLink.') || key === 'panel.students.selfEnrolled',
    )
    expect(keys.length).toBeGreaterThan(15)
    const en = enPanel as Record<string, string>
    for (const key of keys) {
      expect(en[key], key).toBeTruthy()
      expect(en[key], key).not.toMatch(/[Ѐ-ӿ]/)
    }
  })
})
