import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProcessingPhase } from '../../types/api'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge — canonical phase axis (TASK-B §2)', () => {
  it('renders the ratified word for each of the five phases', () => {
    const cases: [ProcessingPhase, string][] = [
      ['queued', 'У черзі'],
      ['processing', 'Обробляється'],
      ['awaiting_author', 'Очікує підтвердження'],
      ['ready', 'Готово'],
      ['error', 'Помилка'],
    ]
    for (const [phase, word] of cases) {
      const { unmount } = render(<StatusBadge phase={phase} />)
      expect(screen.getByText(word)).toBeInTheDocument()
      unmount()
    }
  })

  it('splits queued (no pulse) from processing (pulse) — the old "Обробка…" collapse is gone', () => {
    const q = render(<StatusBadge phase="queued" />)
    expect(q.container.querySelector('.animate-pulse-soft')).toBeNull()
    q.unmount()
    const p = render(<StatusBadge phase="processing" />)
    expect(p.container.querySelector('.animate-pulse-soft')).not.toBeNull()
  })

  it('falls back to a muted "—" chip for an unknown phase — no crash, no raw token', () => {
    // A phase the FE does not know yet must degrade gracefully, never leak the
    // token to the author.
    render(<StatusBadge phase={'brand_new_phase' as ProcessingPhase} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('brand_new_phase')).not.toBeInTheDocument()
  })
})
