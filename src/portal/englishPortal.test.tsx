import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// Г-1 §9.3: in English, no page of the portal shows a Cyrillic letter — the
// one exception is the name "Українська" in the language switcher. What the
// server sends (course titles, names, task texts) is Latin here, so the check
// sees only the portal's own words. The real router; its requests mocked.

const api = vi.hoisted(() => ({
  me: vi.fn(),
  courses: vi.fn(),
  courseMaterials: vi.fn(),
  material: vi.fn(),
  languages: vi.fn(),
  submissionPolicy: vi.fn(),
  estimateTask: vi.fn(),
  submissions: vi.fn(),
  billingTerms: vi.fn(),
  billingConsent: vi.fn(),
  billingCheckout: vi.fn(),
  billingBalance: vi.fn(),
  billingPackages: vi.fn(),
  billingStatement: vi.fn(),
  billingOutlook: vi.fn(),
  setInterfaceLanguage: vi.fn(),
}))
vi.mock('./api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/portalClient')>()
  return { ...actual, portalLogin: vi.fn(), portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from './App'
import { PortalLanguageProvider } from './components/PortalLanguageProvider'
import { usePortalLanguage } from './stores/language'
import { usePortalSession } from './stores/session'
import { resetPortalLanguages } from './languages'
import { resetSubmissionPolicy } from './submissionPolicy'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const CYRILLIC = /[Ѐ-ӿ]/
const UKRAINIAN_NAME = 'Українська'

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
}

/** Every Cyrillic word the page shows or reads out, but the switcher's "Українська". */
function cyrillicOnPage(): string[] {
  const texts: string[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    texts.push(node.textContent ?? '')
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
      const value = element.getAttribute(name)
      if (value) texts.push(value)
    }
  }
  return texts
    .map((text) => text.split(UKRAINIAN_NAME).join('').trim())
    .filter((text) => CYRILLIC.test(text))
}

const TREE = {
  id: 'r',
  title: 'Demo course',
  order: 0,
  default_language: 'eng',
  documents: [],
  children: [
    {
      id: 'n1',
      title: 'Part one',
      order: 0,
      default_language: null,
      documents: [
        {
          id: 't1',
          kind: 'task' as const,
          label: 'Task one',
          source_type: 'text',
          order: 0,
          task_type: 'task',
          base: null,
          overlay: null,
        },
      ],
      children: [],
    },
  ],
}

const POLICY_ENTRY = { max_bytes: 10 * 1024 * 1024, accept: ['.py', '.zip'], archive_only: false }

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  usePortalLanguage.setState({ language: 'en', picked: false, syncedToken: null })
  resetPortalLanguages()
  resetSubmissionPolicy()
  for (const mock of Object.values(api)) mock.mockReset()
  api.me.mockResolvedValue({
    student_id: 's',
    tenant_id: T,
    login: 'olena',
    display_name: 'Olena',
    recovery_email: 'olena@example.com',
    recovery_email_confirmed: false,
    preferred_language: null,
    interface_language: 'eng',
  })
  api.courses.mockResolvedValue([{ id: 'r', title: 'Demo course' }])
  api.courseMaterials.mockResolvedValue(TREE)
  api.material.mockResolvedValue({ kind: 'external', url: 'https://example.com/t', slide_urls: null })
  api.languages.mockResolvedValue({
    items: [
      { code: 'eng', name_en: 'English', name_native: 'English' },
      { code: 'deu', name_en: 'German', name_native: 'Deutsch' },
    ],
    total: 2,
  })
  api.submissionPolicy.mockResolvedValue({
    policies: { test: POLICY_ENTRY, short_task: POLICY_ENTRY, task: POLICY_ENTRY, project: POLICY_ENTRY },
  })
  api.estimateTask.mockResolvedValue({
    price_units: 12,
    available_units: 300,
    enough: true,
    missing_units: 0,
    charging_enabled: true,
    basis: 'typical',
    paid_by: 'self',
  })
  api.submissions.mockResolvedValue([])
  api.billingTerms.mockResolvedValue({
    terms_version: '2026-10-01',
    consent_required: true,
    consented_at: null,
  })
  api.billingBalance.mockResolvedValue({
    balance: 300,
    reserved: 12,
    held: 0,
    available: 288,
    difference: 0,
    next_expiry: { units: 300, expires_on: '2027-04-01' },
  })
  api.billingPackages.mockResolvedValue({
    packages: [{ id: 'units-500', units: 500, prices_minor: { EUR: 900 } }],
    purchase: { open: true, reason: null },
  })
  api.billingStatement.mockResolvedValue({
    items: [
      {
        at: '2026-10-02T10:00:00Z',
        kind: 'purchase',
        affects_balance: true,
        units: 300,
        balance_after: 300,
        action: null,
      },
    ],
    next_cursor: null,
  })
  api.billingOutlook.mockResolvedValue({
    reviews_left: 3,
    warning: 'low',
    expiring_soon: { units: 300, expires_on: '2027-04-01' },
    paid_by: 'self',
    charging_enabled: true,
  })
})

async function expectNoCyrillic() {
  await waitFor(() => expect(screen.queryByText(/Loading|Calculating/)).not.toBeInTheDocument())
  expect(cyrillicOnPage()).toEqual([])
  expect(document.documentElement.lang).toBe('en')
}

describe('the portal in English shows no Cyrillic', () => {
  it('sign-in', async () => {
    renderAt(`/${T}/login`)
    await screen.findByRole('heading', { name: 'Sign in' })
    await expectNoCyrillic()
  })

  it('forgot password', async () => {
    renderAt(`/${T}/forgot-password`)
    await screen.findByRole('heading', { name: 'Password recovery' })
    await expectNoCyrillic()
  })

  it('new password', async () => {
    renderAt(`/${T}/reset-password?token=abc`)
    await screen.findByRole('heading', { name: 'New password' })
    await expectNoCyrillic()
  })

  it('email confirmation', async () => {
    renderAt(`/${T}/confirm-email?token=abc`)
    await screen.findByRole('heading', { name: 'Email confirmation' })
    await expectNoCyrillic()
  })

  it('a link that is not a portal page', async () => {
    renderAt('/nothing-here')
    await screen.findByRole('heading', { name: 'Course Supporter student portal' })
    await expectNoCyrillic()
  })

  it('my courses', async () => {
    signIn()
    renderAt(`/${T}/home`)
    await screen.findByText('Demo course')
    await screen.findByText('Backup email')
    await expectNoCyrillic()
  })

  it('a course page with the assignment window open', async () => {
    signIn()
    renderAt(`/${T}/courses/r`)
    fireEvent.click(await screen.findByText('Task one'))
    await screen.findByRole('heading', { name: 'Submit your solution' })
    await screen.findByRole('option', { name: 'Deutsch' })
    await screen.findByText(/Reviewing this assignment costs about/)
    await expectNoCyrillic()
  })

  it('units, with the consent window open', async () => {
    signIn()
    renderAt(`/${T}/billing`)
    fireEvent.click(await screen.findByRole('button', { name: 'Buy' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Before your first purchase, please confirm:')).toBeInTheDocument()
    await screen.findByText('Unit history')
    await expectNoCyrillic()
  })
})
