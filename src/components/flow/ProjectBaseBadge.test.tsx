import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectBaseBadge } from './ProjectBaseBadge'

describe('ProjectBaseBadge', () => {
  it('renders a distinct label for each state', () => {
    const { rerender } = render(<ProjectBaseBadge state="pending" />)
    expect(screen.getByText('Нормалізація…')).toBeInTheDocument()

    rerender(<ProjectBaseBadge state="ready" />)
    expect(screen.getByText('Готово')).toBeInTheDocument()

    rerender(<ProjectBaseBadge state="failed" />)
    expect(screen.getByText('Помилка')).toBeInTheDocument()
  })

  it('applies the failed style token', () => {
    const { container } = render(<ProjectBaseBadge state="failed" />)
    expect(container.firstChild).toHaveClass('text-coral')
  })
})
