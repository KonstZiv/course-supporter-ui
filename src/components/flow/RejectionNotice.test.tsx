import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RejectionNotice } from './RejectionNotice'
import type { UncoveredStaleNodesDetail } from '../../types/api'

const detail: UncoveredStaleNodesDetail = {
  reason: 'uncovered_stale_nodes',
  uncovered_stale_node_ids: ['aaaa1111bbbb', 'cccc2222dddd'],
  hint: 'Stale CourseNodes exist outside the subtree.',
}

describe('RejectionNotice', () => {
  it('shows the count and the stale node ids (truncated)', () => {
    render(
      <RejectionNotice
        detail={detail}
        nodeTitle="Розділ 3"
        onRetryForce={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/застарілі вузли \(2\)/)).toBeInTheDocument()
    expect(screen.getByText('aaaa1111')).toBeInTheDocument()
    expect(screen.getByText('cccc2222')).toBeInTheDocument()
  })

  it('calls onRetryForce when the force button is clicked', () => {
    const onRetryForce = vi.fn()
    render(
      <RejectionNotice
        detail={detail}
        nodeTitle="X"
        onRetryForce={onRetryForce}
        onDismiss={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Повторити з force'))
    expect(onRetryForce).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when closed', () => {
    const onDismiss = vi.fn()
    render(
      <RejectionNotice
        detail={detail}
        nodeTitle="X"
        onRetryForce={vi.fn()}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /закрити/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
