import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// The portal's header: the name, "Мої курси", "Юніти" (unless the author pays
// for the student's reviews) and "Вийти" — on the home, course and units
// pages, through the real portal router.
const api = vi.hoisted(() => ({
  billingOutlook: vi.fn(),
  courses: vi.fn(),
  me: vi.fn(),
  courseMaterials: vi.fn(),
  billingBalance: vi.fn(),
  billingPackages: vi.fn(),
  billingStatement: vi.fn(),
}))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from '../App'
import { PortalApiError } from '../api/portalClient'
import { usePortalSession } from '../stores/session'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const COURSE = 'c0ffee00-0000-7000-8000-000000000001'

function outlook(paidBy: 'self' | 'author') {
  return { reviews_left: null, warning: null, expiring_soon: null, paid_by: paidBy }
}

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

function nav() {
  return screen.getByRole('navigation', { name: 'Розділи порталу' })
}

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().setSession({
    token: 'jwt',
    tenantId: T,
    studentId: 's1',
    displayName: 'Олена',
  })
  for (const mock of Object.values(api)) mock.mockReset()
  api.billingOutlook.mockResolvedValue(outlook('self'))
  api.courses.mockResolvedValue([])
  api.me.mockResolvedValue({
    student_id: 's1',
    tenant_id: T,
    login: 'olena',
    display_name: 'Олена',
    recovery_email: null,
    recovery_email_confirmed: false,
    preferred_language: null,
    interface_language: null,
  })
  api.courseMaterials.mockResolvedValue({
    id: COURSE,
    title: 'Демо-курс',
    order: 0,
    default_language: 'ukr',
    documents: [],
    children: [],
  })
  api.billingBalance.mockResolvedValue({
    balance: 0,
    reserved: 0,
    held: 0,
    available: 0,
    difference: 0,
    next_expiry: null,
  })
  api.billingPackages.mockResolvedValue({ packages: [], purchase: { open: true, reason: null } })
  api.billingStatement.mockResolvedValue({ items: [], next_cursor: null })
})

describe('PortalHeader', () => {
  it.each([
    ['home', `/${T}/home`, 'Мої курси'],
    ['course', `/${T}/courses/${COURSE}`, 'Мої курси'],
    ['units', `/${T}/billing`, 'Юніти'],
  ])('on the %s page: the name, two items, "Вийти"; the current item marked', async (_, path, current) => {
    renderAt(path)
    expect(screen.getByText('Навчальний портал')).toBeInTheDocument()
    expect(screen.getAllByRole('banner')).toHaveLength(1)
    const links = within(nav()).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Мої курси', 'Юніти'])
    expect(links[0]).toHaveAttribute('href', `/${T}/home`)
    expect(links[1]).toHaveAttribute('href', `/${T}/billing`)
    expect(screen.getByRole('button', { name: 'Вийти' })).toBeInTheDocument()

    const marked = within(nav()).getByRole('link', { name: current })
    expect(marked).toHaveAttribute('aria-current')
    expect(marked).toHaveClass('font-semibold', 'underline')
    const other = links.find((l) => l !== marked)!
    expect(other).not.toHaveAttribute('aria-current')
    expect(other).not.toHaveClass('font-semibold')
    await waitFor(() => expect(api.billingOutlook).toHaveBeenCalledWith())
  })

  it('the home item is the page itself on home; on a course page it marks the section', async () => {
    renderAt(`/${T}/courses/${COURSE}`)
    expect(within(nav()).getByRole('link', { name: 'Мої курси' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('the course page keeps its title, now under the header', async () => {
    renderAt(`/${T}/courses/${COURSE}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Демо-курс' }),
    ).toBeInTheDocument()
  })

  it('no "Юніти" when the author pays for the student\'s reviews', async () => {
    api.billingOutlook.mockResolvedValue(outlook('author'))
    renderAt(`/${T}/home`)
    await waitFor(() =>
      expect(within(nav()).queryByRole('link', { name: 'Юніти' })).toBeNull(),
    )
    expect(within(nav()).getByRole('link', { name: 'Мої курси' })).toBeInTheDocument()
  })

  it('the units page still opens by its address when the author pays', async () => {
    api.billingOutlook.mockResolvedValue(outlook('author'))
    renderAt(`/${T}/billing`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Юніти' })).toBeInTheDocument()
  })

  it.each([
    ['the student pays', () => api.billingOutlook.mockResolvedValue(outlook('self'))],
    [
      'the ask failed',
      () => api.billingOutlook.mockRejectedValue(new PortalApiError(500, 'portal api 500')),
    ],
    ['no answer yet', () => api.billingOutlook.mockReturnValue(new Promise(() => {}))],
  ])('"Юніти" is there when %s', async (_, arrange) => {
    arrange()
    renderAt(`/${T}/home`)
    await waitFor(() => expect(api.billingOutlook).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(within(nav()).getByRole('link', { name: 'Юніти' })).toBeInTheDocument()
  })

  it('the signed-in pages say none of the avoided words', async () => {
    for (const path of [`/${T}/home`, `/${T}/courses/${COURSE}`]) {
      const { unmount } = render(
        <RouterProvider
          router={createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
            initialEntries: [path],
          })}
        />,
      )
      await waitFor(() => expect(api.billingOutlook).toHaveBeenCalled())
      const text = document.body.textContent!.toLowerCase()
      for (const word of ['напишіть нам', 'тест', 'баланс', 'поповнення', 'різниц', 'борг', 'provider']) {
        expect(text, `${path}: ${word}`).not.toContain(word)
      }
      unmount()
    }
  })

  it('"Юніти" leads to the units page', async () => {
    const router = renderAt(`/${T}/home`)
    fireEvent.click(within(nav()).getByRole('link', { name: 'Юніти' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Юніти' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/${T}/billing`)
  })

  it('"Вийти" ends the session and goes to the sign-in', async () => {
    const router = renderAt(`/${T}/billing`)
    fireEvent.click(screen.getByRole('button', { name: 'Вийти' }))
    expect(await screen.findByLabelText('Логін')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/${T}/login`)
    expect(usePortalSession.getState().token).toBeNull()
  })
})
