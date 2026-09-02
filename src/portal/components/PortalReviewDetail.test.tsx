import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PortalReviewDetail } from './PortalReviewDetail'
import { portalApi } from '../api/portalClient'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submission: vi.fn() },
  }
})

const mockedSubmission = vi.mocked(portalApi.submission)

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
  ...over,
})

describe('PortalReviewDetail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reviewed → fetches detail, renders review_markdown + score + verdict', async () => {
    mockedSubmission.mockResolvedValue(detail())
    render(<PortalReviewDetail submissionId="sub-1" status="completed" />)
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
    render(<PortalReviewDetail submissionId="sub-1" status="delivered" />)
    await waitFor(() =>
      expect(screen.getByText('Логіка помилкова у кроці 2.')).toBeInTheDocument(),
    )
    expect(screen.getByText('не зараховано')).toBeInTheDocument()
  })

  it('error terminal → curated phrase, NO fetch, NO markdown', async () => {
    render(<PortalReviewDetail submissionId="sub-1" status="rejected" />)
    expect(screen.getByText(/перевірку безпеки/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('mismatch → its own curated phrase', () => {
    render(<PortalReviewDetail submissionId="sub-1" status="mismatch" />)
    expect(screen.getByText(/не схоже на рішення/)).toBeInTheDocument()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('pending / in-flight → "На перевірці", NO fetch', () => {
    render(<PortalReviewDetail submissionId="sub-1" status="reviewing" />)
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
    render(<PortalReviewDetail submissionId="sub-1" status="completed" />)
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
    render(<PortalReviewDetail submissionId="sub-1" status="completed" />)
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
    render(<PortalReviewDetail submissionId="sub-1" status="completed" />)
    await waitFor(() =>
      expect(screen.getByText('Змінено 0, нових 5, видалено 0.')).toBeInTheDocument(),
    )
    expect(screen.queryByText(/Базовий проєкт v/)).not.toBeInTheDocument()
  })

  it('non-project submission (delta null) → no receipt block', async () => {
    mockedSubmission.mockResolvedValue(detail({ delta: null }))
    render(<PortalReviewDetail submissionId="sub-1" status="completed" />)
    await waitFor(() => expect(screen.getByText('Рецензія')).toBeInTheDocument())
    expect(
      screen.queryByText('Порівняння з базовим проєктом'),
    ).not.toBeInTheDocument()
  })
})
