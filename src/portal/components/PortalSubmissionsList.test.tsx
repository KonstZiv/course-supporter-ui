import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalSubmissionsList } from './PortalSubmissionsList'
import { portalApi } from '../api/portalClient'
import type { PortalSubmissionListItem } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submissions: vi.fn(), submission: vi.fn() },
  }
})

const mockedSubmissions = vi.mocked(portalApi.submissions)
const mockedSubmission = vi.mocked(portalApi.submission)

const row = (over: Partial<PortalSubmissionListItem>): PortalSubmissionListItem => ({
  id: 'r',
  status: 'completed',
  score: 85,
  verdict: { passed: true, correctness: 'correct' },
  created_at: '2026-06-29T10:00:00Z',
  original_filename: 'a.py',
  rejection: null,
  not_opened: [],
  ...over,
})

describe('PortalSubmissionsList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('empty → «Ще немає спроб»', async () => {
    mockedSubmissions.mockResolvedValue([])
    render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText('Ще немає спроб.')).toBeInTheDocument())
  })

  it('renders a per-attempt chip for each bucket (error / reviewed / pending)', async () => {
    mockedSubmissions.mockResolvedValue([
      row({ id: 'a', status: 'failed', score: null, verdict: null }),
      row({ id: 'b', status: 'completed', score: 85 }),
      row({ id: 'c', status: 'reviewing', score: null, verdict: null }),
    ])
    render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText('Помилка')).toBeInTheDocument())
    expect(screen.getByText('85/100 · зараховано')).toBeInTheDocument()
    expect(screen.getByText('На перевірці')).toBeInTheDocument()
  })

  it('expands a reviewed row → fetches + renders the review markdown', async () => {
    mockedSubmissions.mockResolvedValue([row({ id: 'b', status: 'completed', score: 85 })])
    mockedSubmission.mockResolvedValue({
      ...row({ id: 'b' }),
      review_markdown: '# Рецензія\n\nЧудово.',
      delta: null,
    })
    render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() =>
      expect(screen.getByText('85/100 · зараховано')).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByText('85/100 · зараховано'))
    await waitFor(() => expect(screen.getByText('Чудово.')).toBeInTheDocument())
    expect(mockedSubmission).toHaveBeenCalledWith('b')
  })

  it('expands an error row → curated phrase, NO detail fetch', async () => {
    mockedSubmissions.mockResolvedValue([
      row({ id: 'a', status: 'rejected', score: null, verdict: null }),
    ])
    render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText('Помилка')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Помилка'))
    await waitFor(() =>
      expect(screen.getByText(/перевірку безпеки/)).toBeInTheDocument(),
    )
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('refresh button re-fetches the list', async () => {
    mockedSubmissions.mockResolvedValue([])
    render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() => expect(mockedSubmissions).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Оновити список спроб' }))
    await waitFor(() => expect(mockedSubmissions).toHaveBeenCalledTimes(2))
  })

  it('re-fetches when reloadKey changes (Q7 submit bridge)', async () => {
    mockedSubmissions.mockResolvedValue([])
    const { rerender } = render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() => expect(mockedSubmissions).toHaveBeenCalledTimes(1))
    rerender(<PortalSubmissionsList taskId="t1" reloadKey={1} />)
    await waitFor(() => expect(mockedSubmissions).toHaveBeenCalledTimes(2))
  })
})

describe('PortalSubmissionsList — the "not read" marker on an attempt row', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks a row whose attempt had files skipped, in the right plural', async () => {
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'a',
        not_opened: [
          { path: '.gitignore', reason: 'forbidden_type', size: 26 },
          { path: 'shot.png', reason: 'forbidden_type', size: 136 },
        ],
      }),
    ])
    render(<PortalSubmissionsList taskId="t" reloadKey={0} />)
    await waitFor(() =>
      expect(screen.getByText('2 файли не прочитано')).toBeInTheDocument(),
    )
  })

  it('marks a PASSING attempt too — the score does not excuse the gap', async () => {
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'a',
        status: 'completed',
        score: 90,
        not_opened: [{ path: 'x.png', reason: 'forbidden_type', size: 9 }],
      }),
    ])
    render(<PortalSubmissionsList taskId="t" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText(/90\/100/)).toBeInTheDocument())
    expect(screen.getByText('1 файл не прочитано')).toBeInTheDocument()
  })

  it('says nothing when nothing was skipped', async () => {
    mockedSubmissions.mockResolvedValue([row({ id: 'a', not_opened: [] })])
    render(<PortalSubmissionsList taskId="t" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText(/85\/100/)).toBeInTheDocument())
    expect(screen.queryByText(/не прочитано/)).not.toBeInTheDocument()
  })

  it('the expanded row explains a refusal without a second request', async () => {
    // The whole reason the row is passed down: rejection + not_opened are on
    // the list item, so opening a refused attempt costs no fetch (DD-6-D).
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'a',
        status: 'rejected',
        score: null,
        verdict: null,
        rejection: { code: 'charset_violation', details: 'work.md' },
      }),
    ])
    render(<PortalSubmissionsList taskId="t" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText('Помилка')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText(/Кодування файла не розпізнано/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })
})
