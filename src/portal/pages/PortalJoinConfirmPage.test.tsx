import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The link of the confirm email (O-1): the token is spent by a press, never
// on load; confirmed — a session, as after sign-in, and the course; a login
// taken since the signup — another one, then the confirm again; a spent or
// expired link — said, with the way on.

const api = vi.hoisted(() => ({
  joinConfirm: vi.fn(),
  joinChangeLogin: vi.fn(),
  joinCard: vi.fn(),
}))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from '../App'
import { PortalApiError } from '../api/portalClient'
import { usePortalSession } from '../stores/session'
import { usePortalLanguage } from '../stores/language'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const COURSE = '019edc00-0000-7000-8000-00000000c0de'
const SIGNUP = '019edc00-0000-7000-8000-0000000000aa'
const STUDENT = '019edaa5-1111-7000-8000-000000000001'
const CONFIRM = `/${T}/join/confirm?token=tok-1`

const CONFIRMED = {
  access_token: 'jwt-new',
  token_type: 'bearer',
  student_id: STUDENT,
  display_name: 'Олена',
  interface_language: 'ukr',
  tenant_id: T,
  course_id: COURSE,
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: `/${T}/courses/:rootId`, element: <div>COURSE PAGE</div> },
      { path: '*', element: <PortalApp /> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const confirmButton = () => screen.getByRole('button', { name: /Підтвердити пошту/ })

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  usePortalLanguage.setState({ language: 'uk', picked: false, syncedToken: null })
  for (const mock of Object.values(api)) mock.mockReset()
})

describe('the confirm link', () => {
  it('is a page of its own, not a course link with the key "confirm"', () => {
    renderAt(CONFIRM)
    expect(screen.getByRole('heading', { name: 'Підтвердження пошти' })).toBeInTheDocument()
    expect(api.joinCard).not.toHaveBeenCalled()
  })

  it('spends the token only on a press', () => {
    renderAt(CONFIRM)
    expect(api.joinConfirm).not.toHaveBeenCalled()
    expect(confirmButton()).toBeEnabled()
  })

  it('confirmed: the session, as after sign-in, and the course', async () => {
    api.joinConfirm.mockResolvedValue(CONFIRMED)
    const router = renderAt(CONFIRM)
    fireEvent.click(confirmButton())
    expect(await screen.findByText('COURSE PAGE')).toBeInTheDocument()
    expect(api.joinConfirm).toHaveBeenCalledWith('tok-1')
    expect(router.state.location.pathname).toBe(`/${T}/courses/${COURSE}`)
    expect(usePortalSession.getState()).toMatchObject({
      token: 'jwt-new',
      tenantId: T,
      studentId: STUDENT,
      displayName: 'Олена',
    })
  })

  it('login_taken: another login for the request, then the confirm again', async () => {
    api.joinConfirm
      .mockRejectedValueOnce(
        new PortalApiError(409, 'x', {
          detail: { code: 'login_taken', details: 'x', signup_id: SIGNUP },
        }),
      )
      .mockResolvedValueOnce(CONFIRMED)
    api.joinChangeLogin
      .mockRejectedValueOnce(
        new PortalApiError(409, 'x', { detail: { code: 'login_taken', details: 'x' } }),
      )
      .mockResolvedValueOnce(undefined)
    renderAt(CONFIRM)
    fireEvent.click(confirmButton())
    expect(await screen.findByText(/цей логін зайняв хтось інший/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Новий логін'), { target: { value: 'olena2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти й підтвердити' }))
    expect(await screen.findByText('Цей логін уже зайнятий. Оберіть інший.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Новий логін'), { target: { value: ' olena3 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти й підтвердити' }))
    expect(await screen.findByText('COURSE PAGE')).toBeInTheDocument()
    expect(api.joinChangeLogin).toHaveBeenLastCalledWith(SIGNUP, { login: 'olena3', token: 'tok-1' })
    expect(api.joinConfirm).toHaveBeenCalledTimes(2)
    expect(usePortalSession.getState().token).toBe('jwt-new')
  })

  it('404: the link is invalid or expired — join again, or sign in if confirmed', async () => {
    api.joinConfirm.mockRejectedValue(
      new PortalApiError(404, 'x', { detail: { code: 'signup_not_found', details: 'x' } }),
    )
    renderAt(CONFIRM)
    fireEvent.click(confirmButton())
    expect(
      await screen.findByText('Посилання підтвердження недійсне або прострочене.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Запишіться на курс знову за посиланням від автора/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'увійдіть' })).toHaveAttribute('href', `/${T}/login`)
    expect(screen.queryByRole('button', { name: /Підтвердити пошту/ })).not.toBeInTheDocument()
    expect(usePortalSession.getState().token).toBeNull()
  })

  it('without a token: the link is incomplete, nothing is sent', async () => {
    renderAt(`/${T}/join/confirm`)
    expect(screen.getByText('Посилання неповне або пошкоджене.')).toBeInTheDocument()
    await waitFor(() => expect(api.joinConfirm).not.toHaveBeenCalled())
  })
})
