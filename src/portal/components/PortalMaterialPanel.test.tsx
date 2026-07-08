import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalMaterialPanel } from './PortalMaterialPanel'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMaterialItem } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      material: vi.fn(),
      submitTask: vi.fn(),
      submissions: vi.fn(),
      base: vi.fn(),
    },
  }
})

const mockedMaterial = vi.mocked(portalApi.material)
const mockedSubmit = vi.mocked(portalApi.submitTask)
const mockedSubmissions = vi.mocked(portalApi.submissions)
const mockedBase = vi.mocked(portalApi.base)

const TASK: PortalMaterialItem = {
  id: 't1',
  kind: 'task',
  label: 'Завдання',
  source_type: 'text',
  order: 0,
  task_type: null,
  base: null,
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
    mockedSubmissions.mockResolvedValue([])
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

  it('shows the "Мої спроби" section for a task, not for a material (c3b)', async () => {
    const { rerender } = render(
      <PortalMaterialPanel item={TASK} onClose={vi.fn()} onSubmitted={vi.fn()} />,
    )
    await waitFor(() => expect(screen.getByText('Мої спроби')).toBeInTheDocument())

    rerender(
      <PortalMaterialPanel item={MATERIAL} onClose={vi.fn()} onSubmitted={vi.fn()} />,
    )
    await waitFor(() =>
      expect(screen.getByText('Відкрити / Завантажити')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Мої спроби')).not.toBeInTheDocument()
  })

  it('re-fetches the attempts list after a successful submit (Q7)', async () => {
    mockedSubmit.mockResolvedValue({
      submission_id: 's',
      status: 'received',
      duplicate: false,
    })
    render(<PortalMaterialPanel item={TASK} onClose={vi.fn()} onSubmitted={vi.fn()} />)
    await waitFor(() => expect(mockedSubmissions).toHaveBeenCalledTimes(1)) // initial
    fireEvent.change(screen.getByLabelText('Файл рішення'), {
      target: { files: [new File(['print()'], 'a.py')] },
    })
    fireEvent.click(screen.getByRole('button', { name: /надіслати/i }))
    // reloadKey bump → the list effect re-runs → a second submissions() call.
    await waitFor(() => expect(mockedSubmissions).toHaveBeenCalledTimes(2))
  })
})

const projectTask = (base: PortalMaterialItem['base']): PortalMaterialItem => ({
  ...TASK,
  task_type: 'project',
  base,
})

const DL_BTN = /завантажити базовий проєкт/i

describe('PortalMaterialPanel — project base affordance + marker (KD18 P5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedMaterial.mockResolvedValue(EXTERNAL)
    mockedSubmissions.mockResolvedValue([])
  })

  it('renders the "Проєкт" marker in the header for a project task', async () => {
    render(
      <PortalMaterialPanel
        item={projectTask(null)}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByText('Проєкт')).toBeInTheDocument())
  })

  it('no marker and no base section for a non-project task', async () => {
    render(<PortalMaterialPanel item={TASK} onClose={vi.fn()} onSubmitted={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Мої спроби')).toBeInTheDocument())
    expect(screen.queryByText('Проєкт')).not.toBeInTheDocument()
    expect(screen.queryByText('Базовий проєкт')).not.toBeInTheDocument()
  })

  it('base=null (base-less project) → no base section, submit still allowed', async () => {
    render(
      <PortalMaterialPanel
        item={projectTask(null)}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.getByText('Проєкт')).toBeInTheDocument())
    expect(screen.queryByText('Базовий проєкт')).not.toBeInTheDocument()
    expect(screen.getByText('Надіслати рішення')).toBeInTheDocument()
  })

  it('base ready → active button; click fetches base + opens a new tab', async () => {
    mockedBase.mockResolvedValue({ original_url: 'https://s3/orig.zip?sig=1' })
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    render(
      <PortalMaterialPanel
        item={projectTask({ version: 1, snapshot_hash: 'h1', state: 'ready' })}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    )
    const btn = await screen.findByRole('button', { name: DL_BTN })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    await waitFor(() => expect(mockedBase).toHaveBeenCalledWith('t1'))
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith('https://s3/orig.zip?sig=1', '_blank'),
    )
    openSpy.mockRestore()
  })

  it('base pending → disabled button + hint (NOT collapsed with base=null)', async () => {
    render(
      <PortalMaterialPanel
        item={projectTask({ version: 1, snapshot_hash: null, state: 'pending' })}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    )
    const btn = await screen.findByRole('button', { name: DL_BTN })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/готується/i)).toBeInTheDocument()
  })

  it('base failed → disabled button + hint', async () => {
    render(
      <PortalMaterialPanel
        item={projectTask({ version: 2, snapshot_hash: null, state: 'failed' })}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    )
    const btn = await screen.findByRole('button', { name: DL_BTN })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/не вдалося обробити/i)).toBeInTheDocument()
  })

  it('download 404 → surfaces the distinct body.detail', async () => {
    mockedBase.mockRejectedValue(
      new PortalApiError(404, 'x', {
        detail: 'No base is available for this task yet.',
      }),
    )
    render(
      <PortalMaterialPanel
        item={projectTask({ version: 1, snapshot_hash: 'h1', state: 'ready' })}
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
      />,
    )
    const btn = await screen.findByRole('button', { name: DL_BTN })
    fireEvent.click(btn)
    await waitFor(() =>
      expect(
        screen.getByText('No base is available for this task yet.'),
      ).toBeInTheDocument(),
    )
  })
})
