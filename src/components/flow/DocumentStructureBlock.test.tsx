import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DocumentStructureBlock } from './DocumentStructureBlock'
import { documentsApi } from '../../api/documents'
import { ApiError } from '../../api/client'
import type { DocumentStructureEntry } from '../../types/api'

vi.mock('../../api/documents', () => ({
  documentsApi: { getStructure: vi.fn() },
}))

const mockedGet = vi.mocked(documentsApi.getStructure)

const entry = (o: Partial<DocumentStructureEntry>): DocumentStructureEntry => ({
  path: 'a.py',
  size: 40,
  reason: 'non_code_type',
  detail: null,
  entries: 1,
  ...o,
})

const toggle = () =>
  screen.getByRole('button', { name: 'Не прочитано під час обробки' })

describe('DocumentStructureBlock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches nothing until the author opens it', () => {
    // The panel lists every document of a node; fetching per code material on
    // mount would fire N requests for a block most of them never open.
    render(<DocumentStructureBlock documentId="d1" />)
    expect(mockedGet).not.toHaveBeenCalled()
    expect(toggle()).toBeInTheDocument()
  })

  it('fetches once, on expand, and keeps the answer', async () => {
    mockedGet.mockResolvedValue({ excluded: [], description_only: [] })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1))
    fireEvent.click(toggle()) // collapse
    fireEvent.click(toggle()) // expand again
    await waitFor(() =>
      expect(screen.getByText('Усі файли матеріалу прочитано.')).toBeInTheDocument(),
    )
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })

  it('two empty lists mean the project was read whole — not that there is no answer', async () => {
    mockedGet.mockResolvedValue({ excluded: [], description_only: [] })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(
      await screen.findByText('Усі файли матеріалу прочитано.'),
    ).toBeInTheDocument()
  })

  it('404 removes the block entirely — there is no such surface', async () => {
    // A non-code material, or code still being processed. Distinct from two
    // empty lists, which is a real answer.
    mockedGet.mockRejectedValue(new ApiError(404, 'Document not found', null))
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Не прочитано під час обробки' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('any other failure says so and keeps the block', async () => {
    mockedGet.mockRejectedValue(new ApiError(500, 'boom', null))
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(
      await screen.findByText('Не вдалося завантажити перелік. Спробуйте ще раз.'),
    ).toBeInTheDocument()
  })

  it('renders the two groups under their own headings', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({ path: 'logo.png', reason: 'non_code_type' })],
      description_only: [
        entry({
          path: 'package-lock.json',
          reason: 'lockfile',
          detail: 'package-lock.json',
          size: 24_000,
        }),
      ],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(await screen.findByText('Не увійшли до матеріалу')).toBeInTheDocument()
    expect(screen.getByText('Увійшли лише назвою')).toBeInTheDocument()
    expect(screen.getByText(/Не є кодом/)).toBeInTheDocument()
    expect(screen.getByText(/Список залежностей проєкту/)).toBeInTheDocument()
  })

  it('an empty group is not drawn', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({ path: 'logo.png' })],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(await screen.findByText('Не увійшли до матеріалу')).toBeInTheDocument()
    expect(screen.queryByText('Увійшли лише назвою')).not.toBeInTheDocument()
  })

  it('a collapsed directory shows how many files it stands for', async () => {
    // Without the count "__MACOSX/" reads as one stray file rather than five.
    mockedGet.mockResolvedValue({
      excluded: [
        entry({ path: '__MACOSX/', reason: 'denylist_dir', entries: 5, size: 200 }),
      ],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(await screen.findByText(/5 файлів/)).toBeInTheDocument()
  })

  it('a single-file row shows no count', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({ path: '.DS_Store', reason: 'denylist_file', entries: 1 })],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    await screen.findByText(/Службовий файл/)
    expect(screen.queryByText(/1 файлів/)).not.toBeInTheDocument()
  })

  it('never shows the oversize detail — it is an internal English string', async () => {
    mockedGet.mockResolvedValue({
      excluded: [],
      description_only: [
        entry({
          path: 'data.csv',
          reason: 'oversize',
          detail: 'file size 6291456 B exceeds the 4194304 B per-file cap',
          size: 6_291_456,
        }),
      ],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(await screen.findByText(/Файл більший за 4 МБ/)).toBeInTheDocument()
    expect(screen.queryByText(/exceeds the/)).not.toBeInTheDocument()
    expect(screen.queryByText(/per-file cap/)).not.toBeInTheDocument()
  })

  it('shows the detail everywhere it is a path, a name or a pattern', async () => {
    mockedGet.mockResolvedValue({
      excluded: [],
      description_only: [
        entry({ path: 'app.min.js', reason: 'generated_artifact', detail: '*.min.js' }),
      ],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(await screen.findByText(/\(\*\.min\.js\)/)).toBeInTheDocument()
  })

  it('carries the one block action, once', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({}), entry({ path: 'b.png' })],
      description_only: [entry({ path: 'uv.lock', reason: 'lockfile' })],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    fireEvent.click(toggle())
    expect(await screen.findAllByText(/залийте знову/)).toHaveLength(1)
  })
})
