import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// Г-1 §8: the switcher on every page of the portal — before sign-in on top
// of the page, after it in the header. The language changes in place: what
// is typed stays. The real router; its requests mocked.

const api = vi.hoisted(() => ({
  me: vi.fn(),
  courses: vi.fn(),
  courseMaterials: vi.fn(),
  material: vi.fn(),
  languages: vi.fn(),
  submissionPolicy: vi.fn(),
  estimateTask: vi.fn(),
  submissions: vi.fn(),
  billingOutlook: vi.fn(),
  setInterfaceLanguage: vi.fn(),
}))
vi.mock('./api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/portalClient')>()
  return { ...actual, portalLogin: vi.fn(), portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from './App'
import { portalLogin, PortalApiError } from './api/portalClient'
import { PortalLanguageProvider } from './components/PortalLanguageProvider'
import { usePortalLanguage } from './stores/language'
import { usePortalSession } from './stores/session'
import { resetPortalLanguages } from './languages'
import { resetSubmissionPolicy } from './submissionPolicy'
import { STORAGE_KEYS } from '../privacy/surface'
import { importGraph } from '../i18n/sourceScan'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'

function signIn() {
  usePortalSession.getState().setSession({
    token: 'jwt',
    tenantId: T,
    studentId: '019edaa5-1111-7000-8000-000000000001',
    displayName: 'Olena',
  })
}

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
    initialEntries: [path],
  })
  render(
    <PortalLanguageProvider>
      <RouterProvider router={router} />
    </PortalLanguageProvider>,
  )
  return router
}

const switcher = (name = 'Мова') => screen.getByRole('group', { name })
const pressEnglish = () =>
  fireEvent.click(within(switcher()).getByRole('button', { name: 'English' }))

const me = (interfaceLanguage: string | null) => ({
  student_id: 's',
  tenant_id: T,
  login: 'olena',
  display_name: 'Olena',
  recovery_email: null,
  recovery_email_confirmed: false,
  preferred_language: null,
  interface_language: interfaceLanguage,
})

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  usePortalLanguage.setState({ language: 'uk', picked: false, syncedToken: null })
  resetPortalLanguages()
  resetSubmissionPolicy()
  for (const mock of Object.values(api)) mock.mockReset()
  vi.mocked(portalLogin).mockReset()
  api.me.mockResolvedValue(me(null))
  api.courses.mockResolvedValue([{ id: 'r', title: 'Demo course' }])
  api.billingOutlook.mockResolvedValue({
    reviews_left: null,
    warning: null,
    expiring_soon: null,
    paid_by: 'self',
    charging_enabled: false,
  })
  api.setInterfaceLanguage.mockResolvedValue({ interface_language: 'eng' })
  document.documentElement.lang = 'uk'
  // jsdom's browser speaks English; these students' browsers speak Ukrainian.
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA'])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('before sign-in', () => {
  it.each([
    ['sign-in', `/${T}/login`],
    ['forgot password', `/${T}/forgot-password`],
    ['new password', `/${T}/reset-password?token=abc`],
    ['email confirmation', `/${T}/confirm-email?token=abc`],
    ['not a portal page', '/nothing-here'],
  ])('%s: the switcher, each language named in itself, the current one pressed', (_, path) => {
    renderAt(path)
    const buttons = within(switcher()).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Українська', 'English'])
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false'])
    expect(buttons.map((b) => b.getAttribute('lang'))).toEqual(['uk', 'en'])
  })

  it('changes the page in place: the login typed stays, <html lang> follows, nothing is sent', async () => {
    renderAt(`/${T}/login`)
    fireEvent.change(screen.getByLabelText('Логін'), { target: { value: 'olena' } })
    pressEnglish()
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Login')).toHaveValue('olena')
    expect(document.documentElement.lang).toBe('en')
    expect(
      within(switcher('Language')).getByRole('button', { name: 'English' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem(STORAGE_KEYS.portalLanguage)).toBe('en')
    expect(api.setInterfaceLanguage).not.toHaveBeenCalled()
  })
})

describe('the sign-in', () => {
  const signInWith = async (interfaceLanguage: string | null | undefined) => {
    vi.mocked(portalLogin).mockResolvedValue({
      access_token: 'jwt-token',
      token_type: 'bearer',
      student_id: 's',
      display_name: 'Olena',
      ...(interfaceLanguage === undefined ? {} : { interface_language: interfaceLanguage }),
    })
    renderAt(`/${T}/login`)
    fireEvent.change(screen.getByLabelText('Логін'), { target: { value: 'olena' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /увійти/i }))
    await screen.findByText('Demo course')
  }

  it('opens the pages in the language kept in the account', async () => {
    await signInWith('eng')
    expect(screen.getByRole('link', { name: 'My courses' })).toBeInTheDocument()
    expect(api.setInterfaceLanguage).not.toHaveBeenCalled()
    // The sign-in answered it: no second read of the account for the language.
    expect(api.me.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('nothing kept in the account: the browser choice goes there', async () => {
    localStorage.setItem(STORAGE_KEYS.portalLanguage, 'en')
    await signInWith(null)
    expect(api.setInterfaceLanguage).toHaveBeenCalledWith('en')
  })

  it('nothing kept anywhere: nothing is written to the account', async () => {
    await signInWith(null)
    expect(api.setInterfaceLanguage).not.toHaveBeenCalled()
  })

  it('a server without the field: as nothing kept', async () => {
    await signInWith(undefined)
    expect(screen.getByRole('link', { name: 'Мої курси' })).toBeInTheDocument()
    expect(api.setInterfaceLanguage).not.toHaveBeenCalled()
  })
})

describe('signed in', () => {
  it('the header holds the switcher; a choice is shown at once and kept in the account', async () => {
    signIn()
    renderAt(`/${T}/home`)
    await screen.findByText('Demo course')
    const header = screen.getByRole('banner')
    fireEvent.click(within(within(header).getByRole('group', { name: 'Мова' })).getByRole('button', { name: 'English' }))
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(api.setInterfaceLanguage).toHaveBeenCalledWith('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('opens in the language kept in the account', async () => {
    api.me.mockResolvedValue(me('eng'))
    signIn()
    renderAt(`/${T}/home`)
    expect(await screen.findByRole('link', { name: 'My courses' })).toBeInTheDocument()
  })

  it('a server without the endpoint (404): the page says nothing, the choice stays', async () => {
    api.setInterfaceLanguage.mockRejectedValue(new PortalApiError(404, 'portal api 404'))
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    const error = vi.spyOn(console, 'error')
    signIn()
    renderAt(`/${T}/home`)
    await screen.findByText('Demo course')
    pressEnglish()
    await waitFor(() => expect(debug).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_KEYS.portalLanguage)).toBe('en')
  })

  it('the chosen file stays in the assignment window', async () => {
    api.courseMaterials.mockResolvedValue({
      id: 'r',
      title: 'Demo course',
      order: 0,
      default_language: 'ukr',
      documents: [
        {
          id: 't1',
          kind: 'task',
          label: 'Task one',
          source_type: 'text',
          order: 0,
          task_type: 'task',
          base: null,
          overlay: null,
        },
      ],
      children: [],
    })
    api.material.mockResolvedValue({ kind: 'external', url: 'https://example.com/t', slide_urls: null })
    api.languages.mockResolvedValue({ items: [], total: 0 })
    api.submissionPolicy.mockRejectedValue(new Error('offline'))
    api.estimateTask.mockResolvedValue({
      price_units: 0,
      available_units: 0,
      enough: true,
      missing_units: 0,
      charging_enabled: false,
      basis: 'typical',
      paid_by: 'self',
    })
    api.submissions.mockResolvedValue([])
    signIn()
    renderAt(`/${T}/courses/r`)
    fireEvent.click(await screen.findByText('Task one'))
    const file = new File(['print()'], 'solution.py', { type: 'text/plain' })
    fireEvent.change(await screen.findByLabelText('Файл рішення'), { target: { files: [file] } })
    pressEnglish()
    const picker = (await screen.findByLabelText('Solution file')) as HTMLInputElement
    expect(picker.files?.[0]?.name).toBe('solution.py')
    expect(screen.getByRole('button', { name: /Submit/ })).toBeEnabled()
  })
})

describe('the author app', () => {
  it('has no switcher and no language choice', () => {
    const files = importGraph('/src/main.tsx')
    expect(files.length).toBeGreaterThan(20)
    expect(files).not.toContain('/src/portal/stores/language.ts')
    expect(files).not.toContain('/src/portal/components/LanguageSwitcher.tsx')
  })
})
