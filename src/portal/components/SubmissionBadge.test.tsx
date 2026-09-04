import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SubmissionBadge } from './SubmissionBadge'
import type { PortalSubmissionOverlay } from '../types'

const overlay = (o: Partial<PortalSubmissionOverlay>): PortalSubmissionOverlay => ({
  submission_status: 'none',
  last: null,
  best: null,
  ...o,
})

describe('SubmissionBadge', () => {
  it('none → «Не здано»', () => {
    render(<SubmissionBadge overlay={overlay({ submission_status: 'none' })} />)
    expect(screen.getByText('Не здано')).toBeInTheDocument()
  })

  it('pending with no earned result → «На перевірці» alone', () => {
    render(<SubmissionBadge overlay={overlay({ submission_status: 'pending' })} />)
    expect(screen.getByText('На перевірці')).toBeInTheDocument()
  })

  it('error with no earned result → «Помилка» alone', () => {
    render(<SubmissionBadge overlay={overlay({ submission_status: 'error' })} />)
    expect(screen.getByText('Помилка')).toBeInTheDocument()
  })

  // Step Г2 §2.3 — two tiers. These two cases REVERSE a rule this file used to
  // lock ("error with an earlier reviewed best → STILL «Помилка», never the
  // score"). That rule fixed a real bug — an else-fallthrough that showed a
  // stale score INSTEAD of the failure — and it fixed it by hiding the score.
  // The ratified shape keeps the state and the number both: the state is by the
  // latest attempt, the number by the best, and the tone stays the state's, so
  // a score can no longer be mistaken for the current outcome.
  it('error with an earlier reviewed best → state AND number', () => {
    render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'error',
          best: { score: 90, verdict: { passed: true, correctness: 'correct' } },
        })}
      />,
    )
    expect(screen.getByText('Помилка · 90/100 · зараховано')).toBeInTheDocument()
  })

  it('pending over an earlier reviewed best → the earned result does not vanish', () => {
    // The case the change exists for: a new attempt is in flight, and the
    // student's standing 77/100 must not disappear from the tree while it is.
    render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'pending',
          best: { score: 77, verdict: { passed: true, correctness: 'correct' } },
        })}
      />,
    )
    expect(screen.getByText('На перевірці · 77/100 · зараховано')).toBeInTheDocument()
  })

  it('keeps the state tone, not the result tone', () => {
    // A failed latest attempt over a passing best is still red, never green:
    // the tone answers "what is happening now".
    const { container } = render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'error',
          best: { score: 90, verdict: { passed: true, correctness: 'correct' } },
        })}
      />,
    )
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('text-coral')
    expect(badge.className).not.toContain('text-forest')
  })

  it('a best without a usable score adds nothing', () => {
    // pending / null-score attempts never compete for ``best`` server-side, but
    // the shape allows it — a null score must not render "null/100".
    render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'error',
          best: { score: null, verdict: null },
        })}
      />,
    )
    expect(screen.getByText('Помилка')).toBeInTheDocument()
  })

  it('reviewed + passed → «{score}/100 · зараховано»', () => {
    render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'reviewed',
          best: { score: 85, verdict: { passed: true, correctness: 'correct' } },
        })}
      />,
    )
    expect(screen.getByText('85/100 · зараховано')).toBeInTheDocument()
  })

  it('reviewed + NOT passed → «{score}/100 · не зараховано» (DISTINCT from error)', () => {
    render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'reviewed',
          best: { score: 40, verdict: { passed: false, correctness: 'incorrect' } },
        })}
      />,
    )
    expect(screen.getByText('40/100 · не зараховано')).toBeInTheDocument()
    // "checked, not passed" is NOT the same surface as a terminal error.
    expect(screen.queryByText('Помилка')).not.toBeInTheDocument()
  })

  it('reviewed without a usable score → «Перевірено»', () => {
    render(<SubmissionBadge overlay={overlay({ submission_status: 'reviewed' })} />)
    expect(screen.getByText('Перевірено')).toBeInTheDocument()
  })
})
