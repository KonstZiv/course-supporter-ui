import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PortalCoursePage } from './PortalCoursePage'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMaterialTreeNode } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      courseMaterials: vi.fn(),
      material: vi.fn(),
    },
  }
})

const TENANT = '019eda80-67ea-7060-b4c4-9dc85761690e'
const mockedTree = vi.mocked(portalApi.courseMaterials)
const mockedMaterial = vi.mocked(portalApi.material)

const TREE: PortalMaterialTreeNode = {
  id: 'r',
  title: 'Демо-курс',
  order: 0,
  documents: [
    {
      id: 'm1',
      kind: 'material',
      label: 'Вступна лекція',
      source_type: 'video',
      order: 0,
      overlay: null,
    },
  ],
  children: [
    {
      id: 'n1',
      title: 'Розділ 1',
      order: 0,
      documents: [
        {
          id: 't1',
          kind: 'task',
          label: 'Завдання 1',
          source_type: 'text',
          order: 0,
          overlay: {
            submission_status: 'reviewed',
            last: { score: 85, verdict: { passed: true, correctness: 'correct' } },
            best: { score: 85, verdict: { passed: true, correctness: 'correct' } },
          },
        },
      ],
      children: [],
    },
  ],
}

function renderCourse() {
  render(
    <MemoryRouter initialEntries={[`/${TENANT}/courses/r`]}>
      <Routes>
        <Route path="/:tenantId/courses/:rootId" element={<PortalCoursePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PortalCoursePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the tree with a reviewed task badge', async () => {
    mockedTree.mockResolvedValue(TREE)
    renderCourse()
    await waitFor(() => {
      expect(screen.getByText('Вступна лекція')).toBeInTheDocument()
      expect(screen.getByText('Розділ 1')).toBeInTheDocument()
      expect(screen.getByText('Завдання 1')).toBeInTheDocument()
    })
    expect(screen.getByText('85/100 · зараховано')).toBeInTheDocument()
  })

  it('opens the material panel on click and renders the descriptor', async () => {
    mockedTree.mockResolvedValue(TREE)
    mockedMaterial.mockResolvedValue({
      kind: 'external',
      url: 'https://example.com/x',
      slide_urls: null,
    })
    renderCourse()
    await waitFor(() => expect(screen.getByText('Вступна лекція')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Вступна лекція'))
    await waitFor(() => {
      expect(mockedMaterial).toHaveBeenCalledWith('m1')
      expect(screen.getByText('Відкрити / Завантажити')).toBeInTheDocument()
    })
  })

  it('shows "course not found" on a 404', async () => {
    mockedTree.mockRejectedValue(new PortalApiError(404, 'nope'))
    renderCourse()
    await waitFor(() => {
      expect(screen.getByText('Курс не знайдено.')).toBeInTheDocument()
    })
  })
})
