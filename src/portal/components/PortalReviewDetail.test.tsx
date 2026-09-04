import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PortalReviewDetail } from './PortalReviewDetail'
import { portalApi } from '../api/portalClient'
import type { PortalNotOpened, PortalSubmissionListItem } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submission: vi.fn() },
  }
})

const mockedSubmission = vi.mocked(portalApi.submission)

const row = (over: Partial<PortalSubmissionListItem> = {}): PortalSubmissionListItem => ({
  id: 'sub-1',
  status: 'completed',
  score: 85,
  verdict: { passed: true, correctness: 'correct' },
  created_at: '2026-06-29T10:00:00Z',
  original_filename: 'a.py',
  rejection: null,
  not_opened: [],
  recovered_encoding: null,
  ...over,
})

const detail = (over: Partial<Parameters<typeof mockedSubmission.mockResolvedValue>[0]> = {}) => ({
  id: 'sub-1',
  status: 'completed',
  score: 85,
  verdict: { passed: true, correctness: 'correct' },
  review_markdown: '# Рецензія\n\nДобре виконано.',
  created_at: '2026-06-29T10:00:00Z',
  original_filename: 'a.py',
  delta: null,
  rejection: null,
  not_opened: [],
  recovered_encoding: null,
  ...over,
})

describe('PortalReviewDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reviewed → fetches detail, renders review_markdown + score + verdict', async () => {
    mockedSubmission.mockResolvedValue(detail())
    render(<PortalReviewDetail row={row({ status: 'completed' })} />)
    await waitFor(() => expect(screen.getByText('Рецензія')).toBeInTheDocument())
    expect(screen.getByText('Добре виконано.')).toBeInTheDocument()
    expect(screen.getByText('85/100')).toBeInTheDocument()
    expect(screen.getByText('зараховано')).toBeInTheDocument()
  })

  it('reviewed + NOT passed → STILL renders the markdown (explains why)', async () => {
    mockedSubmission.mockResolvedValue(
      detail({
        score: 30,
        verdict: { passed: false, correctness: 'incorrect' },
        review_markdown: '# Рецензія\n\nЛогіка помилкова у кроці 2.',
      }),
    )
    render(<PortalReviewDetail row={row({ status: 'delivered' })} />)
    await waitFor(() =>
      expect(screen.getByText('Логіка помилкова у кроці 2.')).toBeInTheDocument(),
    )
    expect(screen.getByText('не зараховано')).toBeInTheDocument()
  })

  it('error terminal → curated phrase, NO fetch, NO markdown', async () => {
    render(<PortalReviewDetail row={row({ status: 'rejected' })} />)
    expect(screen.getByText(/перевірку безпеки/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('mismatch → its own curated phrase', () => {
    render(<PortalReviewDetail row={row({ status: 'mismatch' })} />)
    expect(screen.getByText(/не схоже на рішення/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('pending / in-flight → "На перевірці", NO fetch', () => {
    render(<PortalReviewDetail row={row({ status: 'reviewing' })} />)
    expect(screen.getByText(/На перевірці/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })
})

describe('PortalReviewDetail — I2 delta receipt (KD18 P5)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('project delta with a stale base → counts + "author updated" staleness', async () => {
    mockedSubmission.mockResolvedValue(
      detail({
        delta: {
          changed: 3,
          new: 2,
          deleted: 1,
          base_version: 1,
          latest_version: 2,
          is_stale: true,
        },
      }),
    )
    render(<PortalReviewDetail row={row({ status: 'completed' })} />)
    await waitFor(() =>
      expect(screen.getByText('Порівняння з базовим проєктом')).toBeInTheDocument(),
    )
    expect(screen.getByText('Змінено 3, нових 2, видалено 1.')).toBeInTheDocument()
    expect(
      screen.getByText('Базовий проєкт v1 — автор оновив до v2.'),
    ).toBeInTheDocument()
  })

  it('project delta on the latest base → counts + "current version"', async () => {
    mockedSubmission.mockResolvedValue(
      detail({
        delta: {
          changed: 0,
          new: 0,
          deleted: 0,
          base_version: 2,
          latest_version: 2,
          is_stale: false,
        },
      }),
    )
    render(<PortalReviewDetail row={row({ status: 'completed' })} />)
    await waitFor(() =>
      expect(screen.getByText('Змінено 0, нових 0, видалено 0.')).toBeInTheDocument(),
    )
    expect(
      screen.getByText('Базовий проєкт v2 (актуальна версія).'),
    ).toBeInTheDocument()
  })

  it('base-less project (base_version null) → counts only, NO staleness row', async () => {
    mockedSubmission.mockResolvedValue(
      detail({
        delta: {
          changed: 0,
          new: 5,
          deleted: 0,
          base_version: null,
          latest_version: null,
          is_stale: false,
        },
      }),
    )
    render(<PortalReviewDetail row={row({ status: 'completed' })} />)
    await waitFor(() =>
      expect(screen.getByText('Змінено 0, нових 5, видалено 0.')).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Базовий проєкт v/)).not.toBeInTheDocument()
  })

  it('non-project submission (delta null) → no receipt block', async () => {
    mockedSubmission.mockResolvedValue(detail({ delta: null }))
    render(<PortalReviewDetail row={row({ status: 'completed' })} />)
    await waitFor(() => expect(screen.getByText('Рецензія')).toBeInTheDocument())
    expect(
      screen.queryByText('Порівняння з базовим проєктом'),
    ).not.toBeInTheDocument()
  })
})

const skipped = (path: string, reason: string, size = 100): PortalNotOpened => ({
  path,
  reason,
  size,
})

describe('PortalReviewDetail — the three phrase layers on a refusal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('layer 1: a code with a ratified article wins over the status phrase', () => {
    render(
      <PortalReviewDetail
        row={row({
          status: 'rejected',
          rejection: { code: 'empty_document', details: 'scan.pdf' },
        })}
      />,
    )
    expect(screen.getByText(/немає тексту для перевірки/)).toBeInTheDocument()
    // The status phrase for 'rejected' must NOT also appear — the code is more
    // specific and replaces it, rather than stacking with it.
    expect(screen.queryByText(/перевірку безпеки/)).not.toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('layer 2: a code with NO article falls to the status phrase, not a generic', () => {
    // stage2_rejected is deliberately absent from the dictionary: the status
    // phrase says more than any generic could, and this is what proves the
    // fall-through actually reaches it.
    render(
      <PortalReviewDetail
        row={row({
          status: 'rejected',
          rejection: { code: 'stage2_rejected', details: 'work.py' },
        })}
      />,
    )
    expect(screen.getByText('Рішення не пройшло перевірку безпеки')).toBeInTheDocument()
  })

  it('layer 2: mismatch keeps its own status phrase too', () => {
    render(
      <PortalReviewDetail
        row={row({
          status: 'mismatch',
          rejection: { code: 'mismatch', details: 'work.zip' },
        })}
      />,
    )
    expect(screen.getByText(/не схоже на рішення/)).toBeInTheDocument()
  })

  it('layer 3: an unknown status with an unknown code still says something', () => {
    render(
      <PortalReviewDetail
        row={row({
          status: 'failed',
          rejection: { code: 'code_from_the_future', details: 'x.py' },
        })}
      />,
    )
    expect(screen.getByText(/Не вдалося обробити подачу/)).toBeInTheDocument()
  })

  it('no rejection at all → the status phrase, exactly as before', () => {
    render(<PortalReviewDetail row={row({ status: 'rejected', rejection: null })} />)
    expect(screen.getByText(/перевірку безпеки/)).toBeInTheDocument()
  })
})

describe('PortalReviewDetail — "Не прочитано під час перевірки"', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does not render at all when nothing was skipped', () => {
    render(<PortalReviewDetail row={row({ status: 'rejected', not_opened: [] })} />)
    expect(screen.queryByText('Не прочитано під час перевірки')).not.toBeInTheDocument()
    expect(screen.queryByText(/не розглядалися/)).not.toBeInTheDocument()
  })

  it('appears on a REFUSED attempt, with the §4 lead-in', () => {
    render(
      <PortalReviewDetail
        row={row({
          status: 'rejected',
          rejection: { code: 'empty_document', details: 'a.zip' },
          not_opened: [skipped('shot.png', 'forbidden_type', 136)],
        })}
      />,
    )
    expect(screen.getByText('Не прочитано під час перевірки')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Ці файли з вашого архіву не розглядалися — рецензія на них не спирається.',
      ),
    ).toBeInTheDocument()
  })

  it('appears on a PASSING attempt, above the review', async () => {
    // The whole point: a score of 85 must not hide that two files never
    // reached the Mentor.
    mockedSubmission.mockResolvedValue(detail())
    const { container } = render(
      <PortalReviewDetail
        row={row({
          status: 'completed',
          not_opened: [
            skipped('.gitignore', 'forbidden_type', 26),
            skipped('shot.png', 'forbidden_type', 136),
          ],
        })}
      />,
    )
    await waitFor(() => expect(screen.getByText('Рецензія')).toBeInTheDocument())
    expect(screen.getByText('Не прочитано під час перевірки')).toBeInTheDocument()

    const text = container.textContent ?? ''
    expect(text.indexOf('Не прочитано під час перевірки')).toBeLessThan(
      text.indexOf('Добре виконано.'),
    )
  })

  it('a line is name — reason (size), with the action where there is one', () => {
    render(
      <PortalReviewDetail
        row={row({
          status: 'completed',
          not_opened: [skipped('docs/report.docx', 'forbidden_type', 24_576)],
        })}
      />,
    )
    expect(screen.getByText('docs/report.docx')).toBeInTheDocument()
    expect(
      screen.getByText(/Документи всередині архіву не читаються\./),
    ).toBeInTheDocument()
    expect(screen.getByText(/Надішліть його окремим файлом\./)).toBeInTheDocument()
    expect(screen.getByText('(24 КБ)')).toBeInTheDocument()
  })

  it('a line without an action carries none — nothing is invented', () => {
    render(
      <PortalReviewDetail
        row={row({
          status: 'completed',
          not_opened: [skipped('bundle.zip', 'nested_archive', 133)],
        })}
      />,
    )
    expect(screen.getByText(/архів усередині архіву\./)).toBeInTheDocument()
    expect(screen.getByText('(133 Б)')).toBeInTheDocument()
  })

  it('shows no service vocabulary — no codes, no separators, no layer names', () => {
    const { container } = render(
      <PortalReviewDetail
        row={row({
          status: 'completed',
          not_opened: [
            skipped('shot.png', 'forbidden_type', 136),
            skipped('bundle.zip', 'nested_archive', 133),
          ],
        })}
      />,
    )
    const text = container.textContent ?? ''
    for (const leak of ['forbidden_type', 'nested_archive', 'NOT OPENED', '==='])
      expect(text).not.toContain(leak)
  })
})

describe('PortalReviewDetail — відновлене кодування (крок Г2 §2.2)', () => {
  beforeEach(() => vi.clearAllMocks())

  const NOTE = /Файл був збережений не в UTF-8/

  it('tells the student in the reviewed bucket', async () => {
    mockedSubmission.mockResolvedValue(detail())
    render(<PortalReviewDetail row={row({ recovered_encoding: 'cp1251' })} />)
    expect(await screen.findByText(NOTE)).toBeInTheDocument()
    expect(screen.getByText('Windows, кирилиця')).toBeInTheDocument()
  })

  it('tells the student in the error bucket — without a fetch', () => {
    render(
      <PortalReviewDetail
        row={row({ status: 'rejected', recovered_encoding: 'cp1251' })}
      />,
    )
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    // The whole point of carrying it on the list row: a refused attempt is
    // where "your file was not UTF-8" explains the most, and that branch
    // never fetches (DD-6-D).
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('tells the student in the pending bucket — without a fetch', () => {
    render(
      <PortalReviewDetail
        row={row({ status: 'reviewing', recovered_encoding: 'cp1251' })}
      />,
    )
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('stays silent on an ordinary UTF-8 submission', async () => {
    mockedSubmission.mockResolvedValue(detail())
    render(<PortalReviewDetail row={row({ recovered_encoding: 'utf-8' })} />)
    await screen.findByText('Добре виконано.')
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('stays silent when the question does not apply', async () => {
    mockedSubmission.mockResolvedValue(detail())
    render(<PortalReviewDetail row={row({ recovered_encoding: null })} />)
    await screen.findByText('Добре виконано.')
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('names an unfamiliar encoding rather than leaving a blank', () => {
    render(
      <PortalReviewDetail
        row={row({ status: 'rejected', recovered_encoding: 'shift_jis' })}
      />,
    )
    expect(screen.getByText('(shift_jis)')).toBeInTheDocument()
  })
})
