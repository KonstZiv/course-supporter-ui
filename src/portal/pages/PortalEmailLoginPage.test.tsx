import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The shared sign-in by email (O-1, variant A), `/login`: one match signs in;
// several — the student picks the author and the login; none — one answer for
// all. The portal's root leads here; `/login` is never a tenant segment.

const api = vi.hoisted(() => ({ loginByEmail: vi.fn() }))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalLogin: vi.fn(), portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from '../App'
import { PortalApiError } from '../api/portalClient'
import { usePortalSession } from '../stores/session'
import { usePortalLanguage } from '../stores/language'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const OTHER = '019edb00-0000-7000-8000-000000000002'
const STUDENT = '019edaa5-1111-7000-8000-000000000001'

function session(tenantId: string) {
  return {
    access_token: `jwt-${tenantId}`,
    token_type: 'bearer',
    student_id: STUDENT,
    display_name: 'Олена',
    interface_language: null,
    tenant_id: tenantId,
  }
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/:tenantId/home', element: <div>HOME PAGE</div> },
      { path: '/:tenantId/join/:key', element: <div>JOIN PAGE</div> },
      { path: '*', element: <PortalApp /> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

function fill(email = 'olena@example.com', password = 'secret-pass') {
  fireEvent.change(screen.getByLabelText('Пошта'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } })
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /^Увійти/ }))

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  usePortalLanguage.setState({ language: 'uk', picked: false, syncedToken: null })
  api.loginByEmail.mockReset()
})

describe('the routes of the shared sign-in', () => {
  it('/login is the sign-in by email, not a tenant segment', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Вхід за поштою' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Навчальний портал Course Supporter' }),
    ).not.toBeInTheDocument()
  })

  it('the portal root leads to /login', () => {
    const router = renderAt('/')
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { name: 'Вхід за поштою' })).toBeInTheDocument()
  })

  it('a tenant UUID is still the tenant portal', () => {
    const router = renderAt(`/${T}`)
    expect(router.state.location.pathname).toBe(`/${T}/home`)
    expect(screen.queryByRole('heading', { name: 'Вхід за поштою' })).not.toBeInTheDocument()
  })

  it('the tenant sign-in leads to the sign-in by email, and back', () => {
    renderAt(`/${T}/login`)
    expect(screen.getByRole('link', { name: 'Увійти за поштою' })).toHaveAttribute('href', '/login')
  })
})

describe('the sign-in by email', () => {
  it('says where the email comes from', () => {
    renderAt('/login')
    expect(
      screen.getByText('Немає пошти в порталі? Увійдіть за посиланням від автора.'),
    ).toBeInTheDocument()
  })

  it('one match: the session of that portal, and its home', async () => {
    api.loginByEmail.mockResolvedValue(session(T))
    const router = renderAt('/login')
    fill(' olena@example.com ')
    submit()
    expect(await screen.findByText('HOME PAGE')).toBeInTheDocument()
    expect(api.loginByEmail).toHaveBeenCalledWith({
      email: 'olena@example.com',
      password: 'secret-pass',
    })
    expect(router.state.location.pathname).toBe(`/${T}/home`)
    expect(usePortalSession.getState()).toMatchObject({ token: `jwt-${T}`, tenantId: T })
  })

  it('leads back to `next` when it is a page of the portal signed in to', async () => {
    api.loginByEmail.mockResolvedValue(session(T))
    renderAt(`/login?next=${encodeURIComponent(`/${T}/join/k3y`)}`)
    fill()
    submit()
    expect(await screen.findByText('JOIN PAGE')).toBeInTheDocument()
  })

  it('…and home when `next` is of another portal', async () => {
    api.loginByEmail.mockResolvedValue(session(OTHER))
    const router = renderAt(`/login?next=${encodeURIComponent(`/${T}/join/k3y`)}`)
    fill()
    submit()
    expect(await screen.findByText('HOME PAGE')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/${OTHER}/home`)
  })

  it('several matches: "author · login" to choose; the choice is asked again with them', async () => {
    api.loginByEmail
      .mockResolvedValueOnce({
        choose: [
          { tenant_id: T, tenant_name: 'Школа Олени', login: 'olena' },
          { tenant_id: OTHER, tenant_name: 'Курси Петра', login: 'olena-p' },
        ],
      })
      .mockResolvedValueOnce(session(OTHER))
    const router = renderAt('/login')
    fill()
    submit()
    expect(await screen.findByRole('heading', { name: 'Оберіть, куди увійти' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Школа Олени · olena' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Курси Петра · olena-p' }))
    expect(await screen.findByText('HOME PAGE')).toBeInTheDocument()
    expect(api.loginByEmail).toHaveBeenLastCalledWith({
      email: 'olena@example.com',
      password: 'secret-pass',
      tenant_id: OTHER,
      login: 'olena-p',
    })
    expect(router.state.location.pathname).toBe(`/${OTHER}/home`)
    expect(usePortalSession.getState().tenantId).toBe(OTHER)
  })

  it('401: one answer, whatever was wrong', async () => {
    api.loginByEmail.mockRejectedValue(new PortalApiError(401, 'x', { detail: 'Invalid login or password' }))
    renderAt('/login')
    fill()
    submit()
    expect(await screen.findByText('Невірна пошта або пароль.')).toBeInTheDocument()
    expect(usePortalSession.getState().token).toBeNull()
  })

  it('429: the minutes to wait', async () => {
    api.loginByEmail.mockRejectedValue(
      new PortalApiError(429, 'x', { detail: { code: 'rate_limited', details: 'x' } }, 600),
    )
    renderAt('/login')
    fill()
    submit()
    expect(await screen.findByText('Забагато спроб. Спробуйте через 10 хв.')).toBeInTheDocument()
  })

  it('an address that is no email is said before anything is sent', async () => {
    renderAt('/login')
    fill('olena')
    submit()
    expect(await screen.findByText('Вкажіть коректну адресу пошти.')).toBeInTheDocument()
    await waitFor(() => expect(api.loginByEmail).not.toHaveBeenCalled())
  })

  it('already signed in: straight to that portal', () => {
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: T,
      studentId: STUDENT,
      displayName: null,
    })
    const router = renderAt('/login')
    expect(router.state.location.pathname).toBe(`/${T}/home`)
  })
})
