import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RejectionNotice, type StaleNodeRef } from './RejectionNotice'

const staleNodes: StaleNodeRef[] = [
  { id: 'aaaa1111bbbb', title: 'Розділ A' },
  { id: 'cccc2222dddd', title: 'Розділ B' },
]

describe('RejectionNotice', () => {
  it('lists stale nodes by resolved title with a navigation affordance', () => {
    render(
      <RejectionNotice
        staleNodes={staleNodes}
        nodeTitle="Розділ 3"
        onNavigate={vi.fn()}
        onRetryForce={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/застарілі вузли \(2\)/)).toBeInTheDocument()
    expect(screen.getByText('Розділ A')).toBeInTheDocument()
    expect(screen.getByText('Розділ B')).toBeInTheDocument()
  })

  it('navigates to a stale node on click', () => {
    const onNavigate = vi.fn()
    render(
      <RejectionNotice
        staleNodes={staleNodes}
        nodeTitle="X"
        onNavigate={onNavigate}
        onRetryForce={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Розділ B'))
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith('cccc2222dddd')
  })

  it('preserves the retry-with-force action', () => {
    const onRetryForce = vi.fn()
    render(
      <RejectionNotice
        staleNodes={staleNodes}
        nodeTitle="X"
        onNavigate={vi.fn()}
        onRetryForce={onRetryForce}
        onDismiss={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Згенерувати з force'))
    expect(onRetryForce).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when closed', () => {
    const onDismiss = vi.fn()
    render(
      <RejectionNotice
        staleNodes={staleNodes}
        nodeTitle="X"
        onNavigate={vi.fn()}
        onRetryForce={vi.fn()}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /закрити/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
