import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type {
  AuthoredDocumentResponse,
  FileRoleProposal,
  FileRoles,
} from '../types/api'
import { ApiError } from '../api/client'
import { ConfirmRolesPage } from './ConfirmRolesPage'

const { getMock, confirmMock, navigateMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  confirmMock: vi.fn(),
  navigateMock: vi.fn(),
}))
vi.mock('../api/documents', () => ({
  documentsApi: { get: getMock, confirmFileRoles: confirmMock },
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const PROPOSAL: FileRoleProposal = {
  files: {
    'src/app.ts': { role: 'full', reason: 'custom_source' },
    'package.json': { role: 'structure_only', reason: 'build_config: package.json' },
  },
  tree_digest: 'digest-1',
  computed_at: 't',
  removed: { count: 3 },
}

function makeDoc(fileRoles: FileRoles | null): AuthoredDocumentResponse {
  return {
    id: 'doc-1',
    course_node_id: 'node-1',
    source_type: 'code',
    material_role: 'educational',
    task_type: null,
    order: 0,
    filename: 'lesson.zip',
    source_url: 's3://x/lesson.zip',
    language: 'ukr',
    state: 'raw',
    processing_phase: 'awaiting_author',
    file_roles: fileRoles,
    content_fingerprint: null,
    raw_hash: null,
    raw_size_bytes: null,
    processed_hash: null,
    processed_at: null,
    pending_job_id: null,
    pending_since: null,
    error_message: null,
    error_category: null,
    created_at: '',
    updated_at: '',
  }
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/document/doc-1/confirm-roles']}>
      <Routes>
        <Route
          path="/document/:documentId/confirm-roles"
          element={<ConfirmRolesPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ConfirmRolesPage', () => {
  beforeEach(() => {
    getMock.mockReset()
    confirmMock.mockReset()
    navigateMock.mockReset()
  })

  it('renders each proposal file with its role and mapped reason (Р15)', async () => {
    getMock.mockResolvedValue(makeDoc({ proposal: PROPOSAL }))
    renderPage()
    expect(await screen.findByText('app.ts')).toBeInTheDocument()
    expect(screen.getByText('package.json')).toBeInTheDocument()
    expect(screen.getByText('власний код уроку')).toBeInTheDocument()
    expect(screen.getByText('конфігурація складання проєкту')).toBeInTheDocument()
    const appSelect = screen.getByLabelText(
      'Роль файла src/app.ts',
    ) as HTMLSelectElement
    expect(appSelect.value).toBe('full')
  })

  it('shows the removed line when removed.count > 0', async () => {
    getMock.mockResolvedValue(makeDoc({ proposal: PROPOSAL }))
    renderPage()
    expect(await screen.findByTestId('removed-line')).toHaveTextContent('3')
  })

  it('hides the removed line when the count is zero', async () => {
    getMock.mockResolvedValue(
      makeDoc({ proposal: { ...PROPOSAL, removed: { count: 0 } } }),
    )
    renderPage()
    await screen.findByText('app.ts')
    expect(screen.queryByTestId('removed-line')).toBeNull()
  })

  it('saves the full per-file coverage + tree_digest, then navigates', async () => {
    getMock.mockResolvedValue(makeDoc({ proposal: PROPOSAL }))
    confirmMock.mockResolvedValue(makeDoc({ proposal: PROPOSAL }))
    renderPage()
    const appSelect = await screen.findByLabelText('Роль файла src/app.ts')
    fireEvent.change(appSelect, { target: { value: 'auxiliary' } })
    fireEvent.click(screen.getByText('Підтвердити й обробити'))
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    expect(confirmMock).toHaveBeenCalledWith('doc-1', {
      files: { 'src/app.ts': 'auxiliary', 'package.json': 'structure_only' },
      tree_digest: 'digest-1',
    })
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/course/node-1'),
    )
  })

  it('on 409 file_roles_stale re-reads the document and shows a notice', async () => {
    getMock.mockResolvedValue(makeDoc({ proposal: PROPOSAL }))
    confirmMock.mockRejectedValue(
      new ApiError(409, 'stale', { code: 'file_roles_stale' }),
    )
    renderPage()
    fireEvent.click(await screen.findByText('Підтвердити й обробити'))
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2))
    expect(navigateMock).not.toHaveBeenCalled()
    expect(await screen.findByText(/екран оновлено/)).toBeInTheDocument()
  })

  it('on 422 shows a validation message and does not navigate', async () => {
    getMock.mockResolvedValue(makeDoc({ proposal: PROPOSAL }))
    confirmMock.mockRejectedValue(
      new ApiError(422, 'incomplete', { code: 'file_roles_incomplete' }),
    )
    renderPage()
    fireEvent.click(await screen.findByText('Підтвердити й обробити'))
    expect(await screen.findByText(/зайвий шлях/)).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('prefills from a stale decision (decision 19)', async () => {
    getMock.mockResolvedValue(
      makeDoc({
        proposal: PROPOSAL,
        decision: {
          files: { 'src/app.ts': 'auxiliary' },
          tree_digest: 'old',
          decided_at: 't',
        },
      }),
    )
    renderPage()
    const appSelect = (await screen.findByLabelText(
      'Роль файла src/app.ts',
    )) as HTMLSelectElement
    expect(appSelect.value).toBe('auxiliary')
  })

  it('shows an error when the document has no proposal', async () => {
    getMock.mockResolvedValue(makeDoc(null))
    renderPage()
    expect(await screen.findByText(/немає пропозиції ролей/)).toBeInTheDocument()
  })
})
