import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalSubmissionsList } from './PortalSubmissionsList'
import { portalApi } from '../api/portalClient'
import type { PortalPresentation, PortalSubmissionListItem } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submissions: vi.fn(), submission: vi.fn() },
  }
})

const mockedSubmissions = vi.mocked(portalApi.submissions)
const mockedSubmission = vi.mocked(portalApi.submission)

// What the SERVER says about an attempt in that lifecycle status — the same
// mapping the backend applies. Tests written against the raw status keep
// driving by it; the components now read the server's answer.
const PRESENTATION: Record<string, PortalPresentation> = {
  rejected: { state: 'not_opened', reason_code: 'stage2_rejected' },
  failed: { state: 'not_opened', reason_code: 'processing_failed' },
  mismatch: { state: 'not_an_attempt', reason_code: 'mismatch' },
  awaiting_funds: { state: 'awaiting_funds', reason_code: 'awaiting_funds' },
  received: { state: 'in_progress', reason_code: null },
  safety_ok: { state: 'in_progress', reason_code: null },
  sanity_ok: { state: 'in_progress', reason_code: null },
  reviewing: { state: 'in_progress', reason_code: null },
  completed: { state: 'reviewed', reason_code: null },
  delivered: { state: 'reviewed', reason_code: null },
}

const row = (over: Partial<PortalSubmissionListItem>): PortalSubmissionListItem => ({
  id: 'r',
  status: over.status ?? 'completed',
  presentation:
    over.presentation ??
    PRESENTATION[over.status ?? 'completed'] ?? {
      state: 'reviewed',
      reason_code: null,
    },
  score: 85,
  verdict: { passed: true, correctness: 'correct' },
  created_at: '2026-06-29T10:00:00Z',
  original_filename: 'a.py',
  rejection: null,
  not_opened: [],
  recovered_encoding: null,
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
    await waitFor(() => expect(screen.getByText('Не відкрито')).toBeInTheDocument())
    expect(screen.getByText('85/100 · зараховано')).toBeInTheDocument()
    expect(screen.getByText('На перевірці')).toBeInTheDocument()
  })

  it('expands a reviewed row → fetches + renders the review markdown', async () => {
    mockedSubmissions.mockResolvedValue([row({ id: 'b', status: 'completed', score: 85 })])
    mockedSubmission.mockResolvedValue({
      ...row({ id: 'b' }),
      review_markdown: '# Рецензія\n\nЧудово.',
      // Null as the backend serves it: no stage writes a structure yet.
      structure: null,
      delta: null,
      own_feedback: null,
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
    await waitFor(() => expect(screen.getByText('Не відкрито')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Не відкрито'))
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
    await waitFor(() => expect(screen.getByText('Не відкрито')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText(/Кодування файла не розпізнано/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })
  it('an oversize project refusal reads with its numbers in «Мої спроби»', async () => {
    // Reaches the student only because curated_rejection now codes the
    // project branch's refusal (source='normalizer', category over_budget)
    // instead of returning null and leaving the row on its status phrase.
    // details carries the two numbers and no words; the sentence is ours.
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'ob',
        status: 'rejected',
        score: null,
        verdict: null,
        original_filename: 'solution.zip',
        rejection: { code: 'over_budget', details: '295 000 / 131 072' },
      }),
    ])
    render(<PortalSubmissionsList taskId="t1" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText('solution.zip')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    await waitFor(() =>
      expect(
        screen.getByText(
          // ``.`` for the thousands separator: the portal groups with a
          // non-breaking space, and the DOM matcher normalises it to a plain
          // one. The exact grouping is pinned in rejectionReasons.test.ts.
          /Проєкт завеликий для перевірки: 295.000 знаків тексту після очищення проти межі 131.072\./,
        ),
      ).toBeInTheDocument(),
    )
    expect(
      screen.getByText(/Приберіть з архіву автоматично створені файли/),
    ).toBeInTheDocument()
    // The detail endpoint is never called for an error row (DD-6-D).
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

})

describe('PortalSubmissionsList — what an attempt is told (task 03)', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['not_an_attempt', 'Не схоже на спробу'],
    ['not_opened', 'Не відкрито'],
    ['awaiting_funds', 'Призупинено'],
    ['in_progress', 'На перевірці'],
  ])('the chip for %s reads «%s», never «Помилка»', async (state, label) => {
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'x',
        status: 'mismatch',
        score: null,
        verdict: null,
        presentation: { state: state as never, reason_code: null },
      }),
    ])
    render(<PortalSubmissionsList taskId="t-1" reloadKey={0} />)

    await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument())
    expect(screen.queryByText('Помилка')).not.toBeInTheDocument()
  })

  it('an off-task attempt expands into the answer, not into an error', async () => {
    // Criterion 6, the attempts-list half: the phrase is an answer to the
    // student with something to do, and no second request is made for it.
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'x',
        status: 'mismatch',
        score: null,
        verdict: null,
        presentation: { state: 'not_an_attempt', reason_code: 'mismatch' },
      }),
    ])
    render(<PortalSubmissionsList taskId="t-1" reloadKey={0} />)
    await waitFor(() =>
      expect(screen.getByText('Не схоже на спробу')).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByText('Не схоже на спробу'))

    expect(screen.getByText(/не схоже на рішення цього завдання/)).toBeInTheDocument()
    expect(screen.getByText(/Перевірте, що подаєте правильний файл/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('a held attempt says it resumes by itself and asks for no resubmission', async () => {
    mockedSubmissions.mockResolvedValue([
      row({
        id: 'x',
        status: 'awaiting_funds',
        score: null,
        verdict: null,
      }),
    ])
    render(<PortalSubmissionsList taskId="t-1" reloadKey={0} />)
    await waitFor(() => expect(screen.getByText('Призупинено')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Призупинено'))

    expect(screen.getByText(/продовжиться автоматично/)).toBeInTheDocument()
    expect(screen.getByText(/Надсилати роботу знову не потрібно/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })
})
