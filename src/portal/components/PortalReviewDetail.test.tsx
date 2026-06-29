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
