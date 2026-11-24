import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalTestForm } from './PortalTestForm'
import { portalApi, PortalApiError } from '../api/portalClient'
import { resetPortalLanguages } from '../languages'
import type {
  PortalBillingBalance,
  PortalReviewEstimate,
  TestStructureResponse,
} from '../types'

// Stage 2b, 5.2 for a test: reviewed without units while something of a
// package is left. The same estimate, without a file; the form says who pays
// when the author does, and stands the panel in place of the button when
// nothing is left — nothing else.

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      estimateTask: vi.fn(),
      testStructure: vi.fn(),
      submitTest: vi.fn(),
      billingBalance: vi.fn(),
      languages: vi.fn(),
      me: vi.fn(),
    },
  }
})

const mockedEstimate = vi.mocked(portalApi.estimateTask)
const mockedSubmitTest = vi.mocked(portalApi.submitTest)
const mockedBalance = vi.mocked(portalApi.billingBalance)

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const PANEL =
  'Тести перевіряються без списання юнітів, поки у вас є залишок пакета. ' +
  'Зараз залишку немає — щоб подати тест, купіть пакет.'

const TEST: TestStructureResponse = {
  version: 'v1',
  accepting_answers: true,
  questions: [{ number: '1', text: 'Питання?', options: [{ label: 'а', text: 'так' }] }],
}

// A test costs nothing; whether it may be sent is "something of a package left".
const testEstimate = (over: Partial<PortalReviewEstimate> = {}): PortalReviewEstimate => ({
  price_units: 0,
  available_units: 12,
  enough: true,
  missing_units: 0,
  charging_enabled: true,
  basis: 'typical',
  paid_by: 'self',
  ...over,
})
const NOTHING_LEFT = testEstimate({ available_units: 0, enough: false, missing_units: 1 })

const balance = (available: number): PortalBillingBalance => ({
  balance: available,
  reserved: 0,
  held: 0,
  available,
  difference: 0,
  next_expiry: null,
})

function renderForm() {
  render(
    <MemoryRouter initialEntries={[`/${T}/courses/root-1`]}>
      <Routes>
        <Route
          path="/:tenantId/courses/:rootId"
          element={<PortalTestForm taskId="task-1" onSubmitted={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

const settle = () => act(async () => {})
const sendBtn = () => screen.queryByRole('button', { name: /надіслати відповіді/i })

beforeEach(() => {
  vi.clearAllMocks()
  resetPortalLanguages()
  vi.mocked(portalApi.testStructure).mockResolvedValue(TEST)
  vi.mocked(portalApi.languages).mockResolvedValue({ items: [], total: 0 })
  vi.mocked(portalApi.me).mockRejectedValue(new Error('no me'))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('PortalTestForm — units', () => {
  it('asks the estimate without a file', async () => {
    mockedEstimate.mockResolvedValue(testEstimate())
    renderForm()
    await settle()
    expect(mockedEstimate).toHaveBeenCalledWith('task-1', null, null)
  })

  it('passes the same response_language to estimate and submitTest', async () => {
    vi.mocked(portalApi.languages).mockResolvedValue({
      items: [
        { code: 'ukr', name_en: 'Ukrainian', name_native: 'українська' },
        { code: 'eng', name_en: 'English', name_native: 'English' },
      ],
      total: 2,
    })
    mockedEstimate.mockResolvedValue(testEstimate())
    mockedSubmitTest.mockResolvedValue({
      submission_id: 'sub-1',
      status: 'received',
      duplicate: false,
    })

    render(
      <MemoryRouter initialEntries={[`/${T}/courses/root-1`]}>
        <Routes>
          <Route
            path="/:tenantId/courses/:rootId"
            element={
              <PortalTestForm
                taskId="task-1"
                courseLanguage="ukr"
                onSubmitted={vi.fn()}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await screen.findByRole('option', { name: 'English' })
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', null, 'ukr')

    fireEvent.change(screen.getByLabelText('Мова рецензії'), { target: { value: 'eng' } })
    await settle()
    expect(mockedEstimate).toHaveBeenLastCalledWith('task-1', null, 'eng')

    fireEvent.click(screen.getByRole('checkbox', { name: 'а) так' }))
    fireEvent.click(sendBtn()!)
    await waitFor(() => expect(mockedSubmitTest).toHaveBeenCalledTimes(1))
    expect(mockedSubmitTest.mock.calls[0]![1].response_language).toBe('eng')
  })

  it('nothing left of a package → the panel in place of the button, with the way to buy', async () => {
    mockedEstimate.mockResolvedValue(NOTHING_LEFT)
    renderForm()
    const line = await screen.findByText(PANEL)
    expect(line.closest('.bg-sun-pale')).not.toBeNull()
    expect(sendBtn()).toBeNull()
    const link = screen.getByRole('link', { name: 'Купити юніти' })
    expect(link).toHaveAttribute('href', `/${T}/billing`)
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('something left → as before: the button, no words about units', async () => {
    mockedEstimate.mockResolvedValue(testEstimate())
    renderForm()
    await screen.findByRole('checkbox', { name: 'а) так' })
    await settle()
    expect(sendBtn()).toBeEnabled()
    expect(screen.queryByText(PANEL)).toBeNull()
    expect(document.body.textContent).not.toMatch(/юніт|не списує/i)
  })

  it('charging off → as before, even with nothing left', async () => {
    mockedEstimate.mockResolvedValue({ ...NOTHING_LEFT, charging_enabled: false })
    renderForm()
    await screen.findByRole('checkbox', { name: 'а) так' })
    await settle()
    expect(sendBtn()).toBeEnabled()
    expect(screen.queryByText(PANEL)).toBeNull()
  })

  it('the author pays → row 1 for a test too, and the button', async () => {
    mockedEstimate.mockResolvedValue(
      testEstimate({
        price_units: null,
        available_units: null,
        missing_units: null,
        paid_by: 'author',
        charging_enabled: false,
      }),
    )
    renderForm()
    expect(
      await screen.findByText('Перевірку цієї роботи оплачує автор курсу.'),
    ).toBeInTheDocument()
    expect(sendBtn()).toBeEnabled()
  })

  it('waits for "available > 0", then asks once again → the button back', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    mockedEstimate.mockResolvedValueOnce(NOTHING_LEFT).mockResolvedValueOnce(testEstimate())
    mockedBalance.mockResolvedValueOnce(balance(0)).mockResolvedValue(balance(500))

    renderForm()
    await settle()
    expect(screen.getByText(PANEL)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(mockedBalance).toHaveBeenCalledTimes(1)
    expect(mockedEstimate).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    await settle()
    expect(mockedEstimate).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Юнітів тепер вистачає.')).toBeInTheDocument()
    expect(sendBtn()).toBeEnabled()
  })

  it('a 402 on sending → the panel, the ticks kept, nothing sent again', async () => {
    mockedEstimate.mockResolvedValue(testEstimate())
    mockedSubmitTest.mockRejectedValue(
      new PortalApiError(402, 'portal api 402', {
        detail: {
          code: 'insufficient_units',
          details: { price_units: 0, available_units: 0, missing_units: 1 },
        },
      }),
    )
    renderForm()
    const box = await screen.findByRole('checkbox', { name: 'а) так' })
    fireEvent.click(box)
    fireEvent.click(sendBtn()!)
    expect(await screen.findByText(PANEL)).toBeInTheDocument()
    expect(box).toBeChecked()
    expect(sendBtn()).toBeNull()
    expect(mockedSubmitTest).toHaveBeenCalledTimes(1)
  })
})
