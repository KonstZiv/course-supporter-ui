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

  it('pending → «На перевірці»', () => {
    render(<SubmissionBadge overlay={overlay({ submission_status: 'pending' })} />)
    expect(screen.getByText('На перевірці')).toBeInTheDocument()
  })

  it('error → «Помилка» (c3b de-collapse; the bug-fix branch)', () => {
    render(<SubmissionBadge overlay={overlay({ submission_status: 'error' })} />)
    expect(screen.getByText('Помилка')).toBeInTheDocument()
  })

  it('error with an earlier reviewed best → STILL «Помилка», never the score', () => {
    // G case: latest attempt failed, an earlier attempt scored 90. The badge is
    // by the latest → "Помилка", NOT "90/100 · зараховано" (the else-fallthrough
    // bug this branch fixes).
    render(
      <SubmissionBadge
        overlay={overlay({
          submission_status: 'error',
          best: { score: 90, verdict: { passed: true, correctness: 'correct' } },
        })}
      />,
    )
    expect(screen.getByText('Помилка')).toBeInTheDocument()
    expect(screen.queryByText(/90\/100/)).not.toBeInTheDocument()
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
