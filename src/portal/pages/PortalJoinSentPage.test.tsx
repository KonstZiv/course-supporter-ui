import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// "Confirm your email" after a signup (O-1): the masked address, the seven
// days, the resend with its countdown — the server's own pause, and a 429's
// Retry-After — and a request that is no longer pending. The request travels
// in the address, so the page outlives a reload.

const api = vi.hoisted(() => ({ joinResend: vi.fn(), joinCard: vi.fn() }))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from '../App'
import { PortalApiError } from '../api/portalClient'
import { usePortalSession } from '../stores/session'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const KEY = 'k3y'
const SIGNUP = '019edc00-0000-7000-8000-0000000000aa'
const SENT = `/${T}/join/${KEY}/sent?signup=${SIGNUP}`

function renderAt(entry: string | { pathname: string; search: string; state: unknown }) {
  const router = createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
    initialEntries: [entry],
  })
  render(<RouterProvider router={router} />)
  return router
}

const resendButton = () => screen.getByRole('button', { name: 'Надіслати лист ще раз' })

/** Let the clock run, as a second passes on the page. */
async function pass(seconds: number) {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
  localStorage.clear()
  usePortalSession.getState().clear()
  api.joinResend.mockReset()
  api.joinCard.mockReset()
  api.joinCard.mockResolvedValue({
    course_id: 'c',
    course_title: 'Demo',
    author_name: 'A',
    languages: [],
    terms_version: '2027-01-15',
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the "confirm your email" page', () => {
  it('shows the masked address and the seven days, not the course', () => {
    renderAt({
      pathname: `/${T}/join/${KEY}/sent`,
      search: `?signup=${SIGNUP}`,
      state: { emailMasked: 'o***@e***.com' },
    })
    expect(screen.getByRole('heading', { name: 'Підтвердіть пошту' })).toBeInTheDocument()
    expect(screen.getByText('Лист надіслано на o***@e***.com.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Ми надіслали лист із посиланням. Підтвердіть пошту протягом 7 днів, інакше запис буде скасовано і доведеться записатися знову.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Курс відкриється після підтвердження пошти.')).toBeInTheDocument()
  })

  it('after a reload — no answer kept, only the address — it still stands, and resends', async () => {
    api.joinResend.mockResolvedValue({
      signup_id: SIGNUP,
      email_masked: 'o***@e***.com',
      expires_at: '2026-11-30T10:00:00Z',
    })
    renderAt(SENT)
    expect(screen.getByRole('heading', { name: 'Підтвердіть пошту' })).toBeInTheDocument()
    expect(screen.queryByText(/Лист надіслано на/)).not.toBeInTheDocument()
    await pass(60)
    fireEvent.click(resendButton())
    expect(await screen.findByText('Лист надіслано на o***@e***.com.')).toBeInTheDocument()
    expect(api.joinResend).toHaveBeenCalledWith(SIGNUP)
  })

  it('the resend waits 60 seconds, counting down; again after each resend', async () => {
    api.joinResend.mockResolvedValue({ signup_id: SIGNUP, email_masked: 'o***@e***.com', expires_at: 'x' })
    renderAt(SENT)
    expect(resendButton()).toBeDisabled()
    expect(screen.getByText('Надіслати лист ще раз можна через 60 с.')).toBeInTheDocument()
    await pass(1)
    expect(screen.getByText('Надіслати лист ще раз можна через 59 с.')).toBeInTheDocument()
    await pass(59)
    expect(resendButton()).toBeEnabled()
    expect(screen.queryByText(/можна через/)).not.toBeInTheDocument()

    fireEvent.click(resendButton())
    expect(
      await screen.findByText('Лист надіслано ще раз. Попереднє посилання більше не діє.'),
    ).toBeInTheDocument()
    expect(resendButton()).toBeDisabled()
    expect(screen.getByText('Надіслати лист ще раз можна через 60 с.')).toBeInTheDocument()
  })

  it('429: the minutes to wait, and the button waits Retry-After', async () => {
    api.joinResend.mockRejectedValue(
      new PortalApiError(429, 'x', { detail: { code: 'rate_limited', details: 'x' } }, 150),
    )
    renderAt(SENT)
    await pass(60)
    fireEvent.click(resendButton())
    expect(await screen.findByText('Забагато спроб. Спробуйте через 3 хв.')).toBeInTheDocument()
    expect(resendButton()).toBeDisabled()
    await pass(149)
    expect(resendButton()).toBeDisabled()
    await pass(1)
    expect(resendButton()).toBeEnabled()
    expect(screen.queryByText(/Забагато спроб/)).not.toBeInTheDocument()
  })

  it('404: the request is no longer pending — join again, or sign in', async () => {
    api.joinResend.mockRejectedValue(
      new PortalApiError(404, 'x', { detail: { code: 'signup_not_found', details: 'x' } }),
    )
    renderAt(SENT)
    await pass(60)
    fireEvent.click(resendButton())
    expect(
      await screen.findByText('Заявки на запис уже немає: пошту підтверджено або минуло 7 днів.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Записатися знову' })).toHaveAttribute(
      'href',
      `/${T}/join/${KEY}`,
    )
    expect(screen.getByRole('link', { name: 'Увійти' })).toHaveAttribute('href', `/${T}/login`)
  })

  it('without a request in the address, back to the enrollment page', async () => {
    const router = renderAt(`/${T}/join/${KEY}/sent`)
    expect(router.state.location.pathname).toBe(`/${T}/join/${KEY}`)
    expect(await screen.findByRole('heading', { name: 'Demo' })).toBeInTheDocument()
  })
})
