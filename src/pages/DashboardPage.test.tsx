import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'
import { getLanguages } from '../utils/languages'

// Task 2.4.13 — course language is required at root creation. This test
// covers the new submit-gate behaviour: the "Створити" button stays
// disabled until the user picks a language from the dropdown, and the
// language list is loaded from the new backend endpoint
// (``GET /api/v1/config/languages``). The createRoot call carries the
// picked language as default_language.
//
// This is the primary new user-facing behaviour without an ai-review
// safety net (DD-2.4-J — UI repo has no review bot); see the post-merge
// notes §6 of task 2.4.13 (UI half).

vi.mock('../api/config', () => ({
  configApi: {
    getLanguages: vi.fn(() =>
      Promise.resolve({
        items: [
          { code: 'ukr', name_en: 'Ukrainian', name_native: null },
          { code: 'eng', name_en: 'English', name_native: null },
        ],
        total: 2,
      }),
    ),
  },
}))

vi.mock('../api/nodes', () => ({
  nodesApi: {
    listRoots: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    createRoot: vi.fn((data: { default_language: string; title: string }) =>
      Promise.resolve({
        id: 'new-course-id',
        tenant_id: 't-1',
        parent_id: null,
        title: data.title,
        description: null,
        default_language: data.default_language,
        order: 0,
        content_hash: null,
        children_count: 0,
        authored_documents_count: 0,
        created_at: '2026-06-02T00:00:00Z',
        updated_at: '2026-06-02T00:00:00Z',
      }),
    ),
  },
}))

async function renderAndOpenModal() {
  // Warm the language cache explicitly — the production boot prefetch
  // lives in ``App.tsx`` ``ProtectedRoute``, which this test does not
  // mount. Without this, ``LanguageSelect`` would render an empty list.
  await getLanguages()

  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
  await waitFor(() => {
    expect(screen.getByText('Мої курси')).toBeInTheDocument()
  })
  const openButton = screen.getByRole('button', { name: /^новий курс$/i })
  fireEvent.click(openButton)
  await waitFor(() => {
    expect(screen.getByText('Назва курсу')).toBeInTheDocument()
  })
  return screen
}

function getSubmitButton(s: typeof screen): HTMLElement {
  // Two "Створити" buttons might exist (dashboard "Створити перший курс"
  // is rendered only when courses.length === 0; the modal "Створити" is
  // always shown when the modal is open). Pick the last (modal's).
  const all = s.getAllByRole('button', { name: /^створити$/i })
  const last = all[all.length - 1]
  if (last === undefined) {
    throw new Error('No "Створити" submit button found in DashboardPage modal')
  }
  return last
}

describe('DashboardPage — required course language (Task 2.4.13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // RTL does not auto-cleanup with vitest globals=false (see test-setup.ts).
  // Without this, mounted DOM leaks across tests and produces "found
  // multiple elements" failures.
  afterEach(() => {
    cleanup()
  })

  it('keeps "Створити" disabled until both title and language are provided', async () => {
    const s = await renderAndOpenModal()
    const submit = getSubmitButton(s)
    expect(submit).toBeDisabled()

    // Title only — still disabled.
    const titleInput = s.getByPlaceholderText(/Python для початківців/i)
    fireEvent.change(titleInput, { target: { value: 'Sample course' } })
    expect(submit).toBeDisabled()

    // Wait for language list to populate, then pick.
    const select = s.getByRole('combobox')
    await waitFor(() => {
      expect(within(select).getByText('Ukrainian')).toBeInTheDocument()
    })
    fireEvent.change(select, { target: { value: 'ukr' } })
    expect(submit).toBeEnabled()
  })

  it('submits the picked language as default_language', async () => {
    const { nodesApi } = await import('../api/nodes')
    const s = await renderAndOpenModal()

    const titleInput = s.getByPlaceholderText(/Python для початківців/i)
    fireEvent.change(titleInput, { target: { value: 'Course X' } })

    const select = s.getByRole('combobox')
    await waitFor(() => {
      expect(within(select).getByText('English')).toBeInTheDocument()
    })
    fireEvent.change(select, { target: { value: 'eng' } })

    fireEvent.click(getSubmitButton(s))

    await waitFor(() => {
      expect(nodesApi.createRoot).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Course X', default_language: 'eng' }),
      )
    })
  })
})
