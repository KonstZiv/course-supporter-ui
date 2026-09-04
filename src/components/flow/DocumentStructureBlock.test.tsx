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

/** N rows in one group, so the heading's count can be driven precisely. */
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => entry({ path: `f${i}.png` }))

describe('DocumentStructureBlock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks on mount, before anything is opened', async () => {
    // The heading carries a count, and a count cannot come from a request that
    // has not been made — an author who never opens the block still has to
    // learn there is something in it.
    mockedGet.mockResolvedValue({ excluded: rows(2), description_only: [] })
    render(<DocumentStructureBlock documentId="d1" />)
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(1))
    expect(mockedGet).toHaveBeenCalledWith('d1')
  })

  it('counts BOTH groups in the heading', async () => {
    mockedGet.mockResolvedValue({
      excluded: rows(3),
      description_only: rows(2),
    })
    render(<DocumentStructureBlock documentId="d1" />)
    // Excluded and description-only alike did not reach the model by content;
    // the split is what opening it is for.
    expect(await screen.findByText('5 файлів не прочитано')).toBeInTheDocument()
  })

  it('opens and closes on the heading', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({ path: 'logo.png' })],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    const toggle = await screen.findByText('1 файл не прочитано')
    expect(screen.queryByText('Не увійшли до матеріалу')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.getByText('Не увійшли до матеріалу')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.queryByText('Не увійшли до матеріалу')).not.toBeInTheDocument()
  })

  it('reads it once — opening does not ask again', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({ path: 'logo.png' })],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    const toggle = await screen.findByText('1 файл не прочитано')
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })
})

describe('DocumentStructureBlock — три форми числа', () => {
  beforeEach(() => vi.clearAllMocks())

  // Ukrainian needs three forms and picking one would be visibly wrong two
  // thirds of the time. The teens are the trap: 11 takes the plural the way 5
  // does, not the singular 1 does.
  it.each([
    [1, '1 файл не прочитано'],
    [2, '2 файли не прочитано'],
    [4, '4 файли не прочитано'],
    [5, '5 файлів не прочитано'],
    [11, '11 файлів не прочитано'],
    [12, '12 файлів не прочитано'],
    [14, '14 файлів не прочитано'],
    [21, '21 файл не прочитано'],
    [22, '22 файли не прочитано'],
    [25, '25 файлів не прочитано'],
    [101, '101 файл не прочитано'],
    [201, '201 файл не прочитано'],
  ])('%i → «%s»', async (n, label) => {
    mockedGet.mockResolvedValue({ excluded: rows(n), description_only: [] })
    render(<DocumentStructureBlock documentId="d1" />)
    expect(await screen.findByText(label)).toBeInTheDocument()
  })
})

describe('DocumentStructureBlock — коли нічого не показувати', () => {
  beforeEach(() => vi.clearAllMocks())

  it('two empty lists render nothing at all', async () => {
    // "Everything was read" is not news the author needs told, and a heading
    // reading "0 файлів не прочитано" on every clean upload would be noise.
    mockedGet.mockResolvedValue({ excluded: [], description_only: [] })
    const { container } = render(<DocumentStructureBlock documentId="d1" />)
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('404 renders nothing — the same silence, on purpose', async () => {
    // On the wire a 404 ("no such surface") and two empty lists ("read in
    // full") are different answers, and the server keeps them apart. Here they
    // collapse: neither is something to tell the author about.
    mockedGet.mockRejectedValue(new ApiError(404, 'Document not found', null))
    const { container } = render(<DocumentStructureBlock documentId="d1" />)
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('a failed read is silent too', async () => {
    // A block nobody promised is better absent than announced as broken on
    // every material card.
    mockedGet.mockRejectedValue(new ApiError(500, 'boom', null))
    const { container } = render(<DocumentStructureBlock documentId="d1" />)
    await waitFor(() => expect(mockedGet).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})

describe('DocumentStructureBlock — розкритий вміст', () => {
  beforeEach(() => vi.clearAllMocks())

  const open = async (label: string) => fireEvent.click(await screen.findByText(label))

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
    await open('2 файли не прочитано')
    expect(screen.getByText('Не увійшли до матеріалу')).toBeInTheDocument()
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
    await open('1 файл не прочитано')
    expect(screen.getByText('Не увійшли до матеріалу')).toBeInTheDocument()
    expect(screen.queryByText('Увійшли лише назвою')).not.toBeInTheDocument()
  })

  it('a collapsed directory shows how many files it stands for', async () => {
    // Without the count "__MACOSX/" reads as one stray file rather than 201.
    mockedGet.mockResolvedValue({
      excluded: [
        entry({ path: '__MACOSX/', reason: 'denylist_dir', entries: 201, size: 42_520 }),
      ],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    // The heading counts ROWS, not the files a row stands for: one line to
    // read, 201 files behind it.
    await open('1 файл не прочитано')
    expect(screen.getByText(/201 файлів/)).toBeInTheDocument()
  })

  it('a single-file row shows no count', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({ path: '.DS_Store', reason: 'denylist_file', entries: 1 })],
      description_only: [],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    await open('1 файл не прочитано')
    expect(screen.getByText(/Службовий файл/)).toBeInTheDocument()
    expect(screen.queryByText(/· 1 файлів/)).not.toBeInTheDocument()
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
    await open('1 файл не прочитано')
    expect(screen.getByText(/Файл більший за 4 МБ/)).toBeInTheDocument()
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
    await open('1 файл не прочитано')
    expect(screen.getByText(/\(\*\.min\.js\)/)).toBeInTheDocument()
  })

  it('carries the one block action, once', async () => {
    mockedGet.mockResolvedValue({
      excluded: [entry({}), entry({ path: 'b.png' })],
      description_only: [entry({ path: 'uv.lock', reason: 'lockfile' })],
    })
    render(<DocumentStructureBlock documentId="d1" />)
    await open('3 файли не прочитано')
    expect(screen.getAllByText(/залийте знову/)).toHaveLength(1)
  })
})
