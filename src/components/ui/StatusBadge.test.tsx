import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProcessingPhase } from '../../types/api'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge — processing_phase override (№21 UI2)', () => {
  it('renders the state label when no processing phase is given', () => {
    render(<StatusBadge state="ready" />)
    expect(screen.getByText('Готово')).toBeInTheDocument()
  })

  it('overrides with the awaiting-author badge for that phase', () => {
    // The document's state collapses to `ready` (no in-flight job); only the
    // phase reveals it still awaits the author's file-role confirmation.
    render(<StatusBadge state="ready" processingPhase="awaiting_author" />)
    expect(screen.getByText('Очікує підтвердження')).toBeInTheDocument()
    expect(screen.queryByText('Готово')).not.toBeInTheDocument()
  })

  it('falls back to the state label for another known phase (tolerance)', () => {
    render(<StatusBadge state="pending" processingPhase="processing" />)
    expect(screen.getByText('Обробка…')).toBeInTheDocument()
    expect(screen.queryByText('Очікує підтвердження')).not.toBeInTheDocument()
  })

  it('falls back to the state label for an unknown phase value (no crash)', () => {
    // A phase the FE does not know yet must behave as today — never crash.
    const unknown = 'brand_new_phase' as ProcessingPhase
    render(<StatusBadge state="ready" processingPhase={unknown} />)
    expect(screen.getByText('Готово')).toBeInTheDocument()
  })
})
