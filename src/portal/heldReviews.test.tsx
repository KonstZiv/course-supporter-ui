import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { portalApi } from './api/portalClient'
import { SubmissionBadge } from './components/SubmissionBadge'
import { PortalSubmissionsList } from './components/PortalSubmissionsList'
import { PortalReviewDetail } from './components/PortalReviewDetail'
import { presentationLabel, presentationPhrase, stateTone } from './presentationPhrases'
import type {
  PortalBillingNote,
  PortalPresentation,
  PortalSubmissionDetail,
  PortalSubmissionListItem,
} from './types'

// Stage 2b, 5.3 and 5.5: a review that waits for units says whose — in the
// tree, in the list and in the detail alike — and a review that cost more
// than its reserve says so above the review.

vi.mock('./api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submissions: vi.fn(), submission: vi.fn() },
  }
})

const mockedSubmissions = vi.mocked(portalApi.submissions)
const mockedSubmission = vi.mocked(portalApi.submission)

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'

const AUTHOR_HELD: PortalPresentation = {
  state: 'awaiting_funds',
  reason_code: 'awaiting_author_funds',
}
const OWN_HELD: PortalPresentation = { state: 'awaiting_funds', reason_code: 'awaiting_funds' }

const AUTHOR_TEXT = 'Роботу прийнято. Перевірка почнеться, коли автор курсу поповнить юніти.'
const OWN_TEXT =
  'Перевірку призупинено: на початок перевірки не вистачило юнітів. ' +
  'Після купівлі перевірка продовжиться сама — надсилати роботу знову не потрібно.'

const row = (presentation: PortalPresentation): PortalSubmissionListItem => ({
  id: 'sub-1',
  status: 'awaiting_funds',
  presentation,
  score: null,
  verdict: null,
  created_at: '2026-11-15T10:00:00Z',
  original_filename: 'a.py',
  rejection: null,
  not_opened: [],
  recovered_encoding: null,
  attempt_no: null,
})

function inRoute(node: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[`/${T}/courses/root-1`]}>
      <Routes>
        <Route path="/:tenantId/courses/:rootId" element={node} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('the words of a held review', () => {
  it('the author\'s units: «Чекає перевірки», its sentence, the tone of a hold', () => {
    expect(presentationLabel(AUTHOR_HELD)).toBe('Чекає перевірки')
    expect(presentationPhrase(AUTHOR_HELD)).toBe(AUTHOR_TEXT)
    expect(stateTone(AUTHOR_HELD.state)).toBe(stateTone('awaiting_funds'))
  })

  it('the student\'s own units: «Призупинено» and the new sentence', () => {
    expect(presentationLabel(OWN_HELD)).toBe('Призупинено')
    expect(presentationPhrase(OWN_HELD)).toBe(OWN_TEXT)
  })

  it('a code without a label of its own keeps the state\'s label', () => {
    expect(presentationLabel({ state: 'not_opened', reason_code: 'processing_failed' })).toBe(
      'Не відкрито',
    )
  })
})

describe('in the tree', () => {
  const overlay = (presentation: PortalPresentation) => ({
    submission_status: 'pending' as const,
    presentation,
    last: null,
    best: null,
  })

  it('awaiting_author_funds → «Чекає перевірки»', () => {
    render(<SubmissionBadge overlay={overlay(AUTHOR_HELD)} />)
    expect(screen.getByText('Чекає перевірки')).toHaveClass('bg-amber-pale')
  })

  it('awaiting_funds → «Призупинено»', () => {
    render(<SubmissionBadge overlay={overlay(OWN_HELD)} />)
    expect(screen.getByText('Призупинено')).toBeInTheDocument()
  })
})

describe('in the list and the detail', () => {
  it('awaiting_author_funds → «Чекає перевірки», the sentence, and no way to buy', async () => {
    mockedSubmissions.mockResolvedValue([row(AUTHOR_HELD)])
    inRoute(<PortalSubmissionsList taskId="task-1" reloadKey={0} />)
    const chip = await screen.findByText('Чекає перевірки')
    fireEvent.click(chip)
    const box = screen.getByText(new RegExp(`^Чекає перевірки — ${AUTHOR_TEXT}`))
    expect(within(box).queryByRole('link')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Купити юніти' })).toBeNull()
    expect(mockedSubmission).not.toHaveBeenCalled()
  })

  it('awaiting_funds → «Призупинено», the new sentence, and "Купити юніти" in a new tab', async () => {
    mockedSubmissions.mockResolvedValue([row(OWN_HELD)])
    inRoute(<PortalSubmissionsList taskId="task-1" reloadKey={0} />)
    fireEvent.click(await screen.findByText('Призупинено'))
    expect(screen.getByText(new RegExp(`^Призупинено — ${OWN_TEXT}`))).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Купити юніти' })
    expect(link).toHaveAttribute('href', `/${T}/billing`)
    expect(link).toHaveAttribute('target', '_blank')
  })
})

describe('6.3 — a review that cost more than its reserve', () => {
  const reviewed: PortalSubmissionListItem = {
    ...row({ state: 'reviewed', reason_code: null }),
    status: 'completed',
    score: 80,
    verdict: { passed: true, correctness: 'correct' },
  }
  const detail = (note: PortalBillingNote | null | undefined): PortalSubmissionDetail => ({
    ...reviewed,
    review_markdown: '# Рецензія\n\nДобре.',
    structure: null,
    delta: null,
    own_feedback: null,
    ...(note === undefined ? {} : { billing_note: note }),
  })

  it.each([
    [2, 1, 'Фактична вартість (2 юніти) перевищила резерв (1 юніт). Рецензію надано повністю. ' +
      'Списано 1 юніт — стільки було зарезервовано; решту вартості бере на себе платформа.'],
    [5, 2, 'Фактична вартість (5 юнітів) перевищила резерв (2 юніти). Рецензію надано повністю. ' +
      'Списано 2 юніти — стільки було зарезервовано; решту вартості бере на себе платформа.'],
    [7, 5, 'Фактична вартість (7 юнітів) перевищила резерв (5 юнітів). Рецензію надано повністю. ' +
      'Списано 5 юнітів — стільки було зарезервовано; решту вартості бере на себе платформа.'],
  ])('cost %i over a reserve of %i → the sentence, word for word, above the review', async (cost, charged, text) => {
    mockedSubmission.mockResolvedValue(
      detail({ kind: 'cost_over_reserve', cost_units: cost, charged_units: charged }),
    )
    render(<PortalReviewDetail row={reviewed} />)
    const note = await screen.findByText(text)
    expect(note).toHaveAttribute('role', 'note')
    expect(note.className).not.toMatch(/coral/)
    expect(note.querySelector('svg')).toBeNull()
    // Above the review.
    const review = screen.getByText('Рецензія')
    expect(note.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it.each([
    ['null', null],
    ['absent', undefined],
    ['another kind', { kind: 'something_else', cost_units: 5, charged_units: 2 } as unknown as PortalBillingNote],
  ])('%s → nothing', async (_, note) => {
    mockedSubmission.mockResolvedValue(detail(note))
    render(<PortalReviewDetail row={reviewed} />)
    await waitFor(() => expect(screen.getByText('Рецензія')).toBeInTheDocument())
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.queryByText(/Фактична вартість/)).toBeNull()
  })
})
