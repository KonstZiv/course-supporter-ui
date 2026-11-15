import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalSubmitForm } from './PortalSubmitForm'
import { portalApi, PortalApiError } from '../api/portalClient'
import { resetPortalLanguages } from '../languages'
import { resetSubmissionPolicy } from '../submissionPolicy'
import { submitErrorMessage } from '../submissionCodes'
import type { PortalBillingBalance, PortalReviewEstimate } from '../types'

// Stage 2b, table 5.1: the price before a submission, the first row that holds
// from the top; and 5.2: the panel in place of the button, the wait for the
// units bought in another tab, and the server's own 402.

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      estimateTask: vi.fn(),
      submitTask: vi.fn(),
      billingBalance: vi.fn(),
      languages: vi.fn(),
      me: vi.fn(),
      submissionPolicy: vi.fn(),
    },
  }
})

const mockedEstimate = vi.mocked(portalApi.estimateTask)
const mockedSubmit = vi.mocked(portalApi.submitTask)
const mockedBalance = vi.mocked(portalApi.billingBalance)

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'

const estimate = (over: Partial<PortalReviewEstimate> = {}): PortalReviewEstimate => ({
  price_units: 5,
  available_units: 20,
  enough: true,
  missing_units: 0,
  charging_enabled: true,
  basis: 'typical',
  paid_by: 'self',
  ...over,
})

const AUTHOR = estimate({
  price_units: null,
  available_units: null,
  missing_units: null,
  enough: true,
  paid_by: 'author',
})

const balance = (available: number): PortalBillingBalance => ({
  balance: available,
  reserved: 0,
  held: 0,
  available,
  difference: 0,
  next_expiry: null,
})

/** A promise the test settles when it chooses. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={[`/${T}/courses/root-1`]}>
      <Routes>
        <Route
          path="/:tenantId/courses/:rootId"
          element={<PortalSubmitForm taskId="task-1" taskType="task" onSubmitted={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

function pickFile(name = 'a.py'): File {
  const file = new File(['print()'], name, { type: 'text/plain' })
  fireEvent.change(screen.getByLabelText('Файл рішення'), { target: { files: [file] } })
  return file
}

/** Let the answers already given reach the screen. */
const settle = () => act(async () => {})

const submitBtn = () => screen.queryByRole('button', { name: /надіслати/i })
const buyLink = () => screen.queryByRole('link', { name: 'Купити юніти' })

beforeEach(() => {
  vi.clearAllMocks()
  resetPortalLanguages()
  resetSubmissionPolicy()
  vi.mocked(portalApi.languages).mockResolvedValue({ items: [], total: 0 })
  vi.mocked(portalApi.submissionPolicy).mockRejectedValue(new Error('no policy'))
  vi.mocked(portalApi.me).mockRejectedValue(new Error('no me'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('table 5.1 — what the student sees before sending', () => {
  it('row 1: the author pays → one plain line, no numbers, no units, the button as before', async () => {
    mockedEstimate.mockResolvedValue(AUTHOR)
    const { container } = renderForm()
    pickFile()
    const line = await screen.findByText('Перевірку цієї роботи оплачує автор курсу.')
    expect(line.tagName).toBe('P')
    expect(line).toHaveClass('text-ink-light')
    expect(line.textContent).not.toMatch(/\d/)
    expect(container.textContent).not.toMatch(/юніт/i)
    // The only figures on the form are the comment's counter.
    const counter = screen.getByText(/^0 \/ /)
    expect(container.textContent!.replace(counter.textContent!, '')).not.toMatch(/\d/)
    expect(submitBtn()).toBeEnabled()
  })

  it('row 1 stands while charging is off too', async () => {
    mockedEstimate.mockResolvedValue({ ...AUTHOR, charging_enabled: false })
    renderForm()
    expect(
      await screen.findByText('Перевірку цієї роботи оплачує автор курсу.'),
    ).toBeInTheDocument()
  })

  it('row 2: charging is off → nothing new, the button as before', async () => {
    mockedEstimate.mockResolvedValue(estimate({ charging_enabled: false, enough: true }))
    const { container } = renderForm()
    pickFile()
    await settle()
    expect(mockedEstimate).toHaveBeenCalledTimes(2)
    expect(container.textContent).not.toMatch(/юніт|вартість|Рахуємо|автор курсу/i)
    expect(container.querySelector('.bg-sun-pale')).toBeNull()
    expect(submitBtn()).toBeEnabled()
  })

  it('row 3: the answer for the file is on its way → the count, and no sending yet', async () => {
    mockedEstimate
      .mockResolvedValueOnce(estimate())
      .mockReturnValueOnce(new Promise<PortalReviewEstimate>(() => undefined))
    renderForm()
    await screen.findByText(/коштує приблизно 5 юнітів/)
    pickFile()
    await settle()
    const line = screen.getByText('Рахуємо орієнтовну вартість…')
    expect(line).toHaveClass('text-ink-light')
    expect(submitBtn()).toBeDisabled()
  })

  it.each([
    ['the network', new TypeError('Failed to fetch')],
    ['a 5xx', new PortalApiError(503, 'portal api 503')],
    ['a 404', new PortalApiError(404, 'portal api 404', { detail: 'Task not found.' })],
  ])('row 4: %s → the price could not be counted, the button stays', async (_, err) => {
    mockedEstimate.mockRejectedValue(err)
    renderForm()
    pickFile()
    const line = await screen.findByText('Точну вартість зараз порахувати не вдалося.')
    expect(line).toHaveClass('text-ink-light')
    expect(submitBtn()).toBeEnabled()
  })

  it('row 5: the doors refuse the file (422) → the submission\'s own words, the button stays', async () => {
    const refusal = new PortalApiError(422, 'portal api 422', {
      detail: { code: 'forbidden_type', details: 'English text for the logs' },
    })
    mockedEstimate.mockResolvedValueOnce(estimate()).mockRejectedValueOnce(refusal)
    renderForm()
    pickFile('a.exe')
    expect(await screen.findByText(submitErrorMessage(refusal))).toBeInTheDocument()
    expect(screen.queryByText(/English text/)).toBeNull()
    expect(submitBtn()).toBeEnabled()
  })

  it('row 6: a review that takes no units says so, in the cost card', async () => {
    mockedEstimate.mockResolvedValue(estimate({ price_units: 0, enough: true }))
    renderForm()
    pickFile()
    const line = await screen.findByText('Ця перевірка не списує юнітів.')
    expect(line.closest('.bg-sun-pale')).toHaveClass('rounded-2xl', 'border-sun', 'p-6', 'text-ink')
    expect(submitBtn()).toBeEnabled()
  })

  it('row 7: the ceiling, enough → "no more than N" and what is available, the button stays', async () => {
    mockedEstimate.mockResolvedValue(
      estimate({ basis: 'ceiling', price_units: 40, available_units: 50, enough: true }),
    )
    renderForm()
    pickFile()
    const line = await screen.findByText(
      'Точну вартість зараз порахувати не вдалося. Перевірка коштуватиме не більше 40 юнітів. ' +
        'У вас доступно 50 юнітів.',
    )
    expect(line.closest('.bg-sun-pale')).not.toBeNull()
    expect(submitBtn()).toBeEnabled()
  })

  it('row 8: the ceiling, not enough → the panel with "ще", in place of the button', async () => {
    // N = 40 shown; the threshold is the typical price 5, so 2 are missing of 3.
    mockedEstimate.mockResolvedValue(
      estimate({
        basis: 'ceiling',
        price_units: 40,
        available_units: 3,
        enough: false,
        missing_units: 2,
      }),
    )
    renderForm()
    pickFile()
    const line = await screen.findByText(
      'Точну вартість зараз порахувати не вдалося. Перевірка коштуватиме не більше 40 юнітів, ' +
        'у вас 3 юніти. Щоб подати роботу, потрібно ще 2 юніти.',
    )
    expect(line.closest('.bg-sun-pale')).not.toBeNull()
    expect(submitBtn()).toBeNull()
    expect(buyLink()).not.toBeNull()
  })

  it('row 9: enough → the typical price without a file, the file\'s price with one', async () => {
    mockedEstimate
      .mockResolvedValueOnce(estimate({ basis: 'typical', price_units: 5, available_units: 20 }))
      .mockResolvedValueOnce(estimate({ basis: 'file', price_units: 8, available_units: 20 }))
    renderForm()
    expect(
      await screen.findByText(
        'Перевірка цього завдання коштує приблизно 5 юнітів. У вас доступно 20 юнітів.',
      ),
    ).toBeInTheDocument()
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', null)

    const file = pickFile()
    const line = await screen.findByText(
      'Перевірка цього завдання коштує приблизно 8 юнітів. У вас доступно 20 юнітів.',
    )
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', file)
    expect(line.closest('.bg-sun-pale')).not.toBeNull()
    expect(submitBtn()).toBeEnabled()
  })

  it('row 10: not enough → the panel, in place of the button', async () => {
    mockedEstimate.mockResolvedValue(
      estimate({ price_units: 12, available_units: 5, enough: false, missing_units: 7 }),
    )
    renderForm()
    pickFile()
    const line = await screen.findByText(
      'Перевірка коштує приблизно 12 юнітів, у вас 5 юнітів. Не вистачає 7 юнітів.',
    )
    expect(line.closest('.bg-sun-pale')).not.toBeNull()
    expect(submitBtn()).toBeNull()
    expect(
      screen.getByText('Обраний файл лишається тут: після купівлі поверніться на цю вкладку.'),
    ).toBeInTheDocument()
  })

  it('a file removed asks again without one', async () => {
    mockedEstimate.mockResolvedValue(estimate())
    renderForm()
    pickFile()
    await settle()
    fireEvent.change(screen.getByLabelText('Файл рішення'), { target: { files: [] } })
    await settle()
    expect(mockedEstimate).toHaveBeenCalledTimes(3)
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', null)
  })

  it('only the last request counts: an older answer that comes later is dropped', async () => {
    const first = deferred<PortalReviewEstimate>()
    const second = deferred<PortalReviewEstimate>()
    mockedEstimate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    renderForm()
    pickFile()

    await act(async () => second.resolve(estimate({ basis: 'file', price_units: 8 })))
    expect(screen.getByText(/коштує приблизно 8 юнітів/)).toBeInTheDocument()

    await act(async () => first.resolve(estimate({ basis: 'typical', price_units: 5 })))
    expect(screen.getByText(/коштує приблизно 8 юнітів/)).toBeInTheDocument()
    expect(screen.queryByText(/коштує приблизно 5 юнітів/)).toBeNull()
  })
})

describe('5.2 — the not-enough panel and the way back after buying', () => {
  const SHORT = estimate({ price_units: 7, available_units: 3, enough: false, missing_units: 4 })

  it('"Купити юніти" opens the portal\'s "Юніти" in a new tab', async () => {
    mockedEstimate.mockResolvedValue(SHORT)
    renderForm()
    pickFile()
    await screen.findByText(/Не вистачає 4 юніти/)
    const link = buyLink()!
    expect(link).toHaveAttribute('href', `/${T}/billing`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toMatch(/noopener/)
  })

  it('looks at the units until the threshold, then asks ONCE again with the same file', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let visibility: DocumentVisibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)

    mockedEstimate
      .mockResolvedValueOnce(SHORT) // on opening
      .mockResolvedValueOnce(SHORT) // for the file
      .mockResolvedValueOnce(estimate({ basis: 'file', price_units: 7, available_units: 7 }))
    mockedBalance
      .mockResolvedValueOnce(balance(5)) // below the threshold 3 + 4
      .mockResolvedValueOnce(balance(5))
      .mockResolvedValue(balance(7))

    renderForm()
    const file = pickFile()
    await settle()
    expect(screen.getByText(/Не вистачає 4 юніти/)).toBeInTheDocument()
    expect(mockedBalance).not.toHaveBeenCalled()

    // Every 10 s while the tab is in view.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(mockedBalance).toHaveBeenCalledTimes(1)
    expect(mockedEstimate).toHaveBeenCalledTimes(2)

    // Not while it is hidden…
    visibility = 'hidden'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(mockedBalance).toHaveBeenCalledTimes(1)

    // …and at once when it comes back.
    visibility = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(mockedBalance).toHaveBeenCalledTimes(2)
    expect(mockedEstimate).toHaveBeenCalledTimes(2) // the file is not sent below the threshold

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await settle()
    expect(mockedBalance).toHaveBeenCalledTimes(3)
    expect(mockedEstimate).toHaveBeenCalledTimes(3)
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', file)

    expect(screen.getByText('Юнітів тепер вистачає.')).toBeInTheDocument()
    expect(submitBtn()).toBeEnabled()
    expect(buyLink()).toBeNull()

    // The panel is gone: nothing more is looked at.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(mockedBalance).toHaveBeenCalledTimes(3)
    expect(mockedEstimate).toHaveBeenCalledTimes(3)
  })

  it('a 402 after all → the panel with the server\'s numbers, the file kept, nothing sent again', async () => {
    mockedEstimate.mockResolvedValue(estimate())
    mockedSubmit.mockRejectedValue(
      new PortalApiError(402, 'portal api 402', {
        detail: {
          code: 'insufficient_units',
          details: { price_units: 9, available_units: 4, missing_units: 5 },
        },
      }),
    )
    renderForm()
    pickFile()
    await screen.findByText(/коштує приблизно 5 юнітів/)
    fireEvent.click(submitBtn()!)

    expect(
      await screen.findByText(
        'Перевірка коштує приблизно 9 юнітів, у вас 4 юніти. Не вистачає 5 юнітів.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Обраний файл лишається тут: після купівлі поверніться на цю вкладку.'),
    ).toBeInTheDocument()
    expect(submitBtn()).toBeNull()
    expect(mockedSubmit).toHaveBeenCalledTimes(1)
    // Enter in the comment does not send it either.
    fireEvent.submit(screen.getByLabelText('Коментар').closest('form')!)
    await settle()
    expect(mockedSubmit).toHaveBeenCalledTimes(1)
  })

  it('a 402 after a ceiling estimate → the words of row 8', async () => {
    mockedEstimate.mockResolvedValue(
      estimate({ basis: 'ceiling', price_units: 40, available_units: 50, enough: true }),
    )
    mockedSubmit.mockRejectedValue(
      new PortalApiError(402, 'portal api 402', {
        detail: {
          code: 'insufficient_units',
          details: { price_units: 40, available_units: 2, missing_units: 3 },
        },
      }),
    )
    renderForm()
    pickFile()
    await screen.findByText(/не більше 40 юнітів\. У вас доступно 50 юнітів/)
    fireEvent.click(submitBtn()!)
    await waitFor(() =>
      expect(
        screen.getByText(
          'Точну вартість зараз порахувати не вдалося. Перевірка коштуватиме не більше 40 юнітів, ' +
            'у вас 2 юніти. Щоб подати роботу, потрібно ще 3 юніти.',
        ),
      ).toBeInTheDocument(),
    )
    expect(mockedSubmit).toHaveBeenCalledTimes(1)
  })
})
