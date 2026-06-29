import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalMaterialPanel } from './PortalMaterialPanel'
import { portalApi } from '../api/portalClient'
import type { PortalMaterialItem } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, material: vi.fn(), submitTask: vi.fn() },
  }
})

const mockedMaterial = vi.mocked(portalApi.material)
const mockedSubmit = vi.mocked(portalApi.submitTask)

const TASK: PortalMaterialItem = {
  id: 't1',
  kind: 'task',
  label: 'Завдання',
  source_type: 'text',
  order: 0,
  overlay: { submission_status: 'none', last: null, best: null },
}
const MATERIAL: PortalMaterialItem = {
  ...TASK,
  id: 'm1',
  kind: 'material',
  overlay: null,
}

const EXTERNAL = { kind: 'external' as const, url: 'https://x', slide_urls: null }

describe('PortalMaterialPanel (c3a submit wiring)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedMaterial.mockResolvedValue(EXTERNAL)
  })

  it('renders the submit form for a task item', async () => {
    render(<PortalMaterialPanel item={TASK} onClose={vi.fn()} onSubmitted={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText('Надіслати рішення')).toBeInTheDocument(),
    )
  })

  it('renders no submit form for a regular material item', async () => {
    render(
      <PortalMaterialPanel item={MATERIAL} onClose={vi.fn()} onSubmitted={vi.fn()} />,
    )
    await waitFor(() =>
      expect(screen.getByText('Відкрити / Завантажити')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Надіслати рішення')).not.toBeInTheDocument()
  })

  it('calls onSubmitted after a successful submit', async () => {
    mockedSubmit.mockResolvedValue({
      submission_id: 's',
      status: 'received',
      duplicate: false,
    })
    const onSubmitted = vi.fn()
    render(<PortalMaterialPanel item={TASK} onClose={vi.fn()} onSubmitted={onSubmitted} />)
    await waitFor(() =>
      expect(screen.getByLabelText('Файл рішення')).toBeInTheDocument(),
    )
    fireEvent.change(screen.getByLabelText('Файл рішення'), {
      target: { files: [new File(['print()'], 'a.py')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /надіслати/i }))
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled())
  })
})
