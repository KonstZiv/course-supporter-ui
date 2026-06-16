import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryBadge } from './SummaryBadge'

describe('SummaryBadge', () => {
  it('renders nothing for status "none"', () => {
    const { container } = render(
      <SummaryBadge status="none" materialsChanged={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for "none" even if materialsChanged is true', () => {
    const { container } = render(
      <SummaryBadge status="none" materialsChanged={true} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the draft chip without a materials-changed chip', () => {
    render(<SummaryBadge status="draft" materialsChanged={false} />)
    expect(screen.getByText('Чернетка')).toBeInTheDocument()
    expect(screen.queryByText('матеріали змінились')).not.toBeInTheDocument()
  })

  it('shows the approved chip', () => {
    render(<SummaryBadge status="approved" materialsChanged={false} />)
    expect(screen.getByText('Затверджено')).toBeInTheDocument()
  })

  it('renders status and materials-changed as two independent chips', () => {
    // The key orthogonality case (Ratified #8): approved + materials_changed
    // shows BOTH — neither axis masks the other.
    render(<SummaryBadge status="approved" materialsChanged={true} />)
    expect(screen.getByText('Затверджено')).toBeInTheDocument()
    expect(screen.getByText('матеріали змінились')).toBeInTheDocument()
  })

  it('uses the "materials changed" label, never "needs regeneration"', () => {
    render(<SummaryBadge status="draft" materialsChanged={true} />)
    expect(screen.getByText('матеріали змінились')).toBeInTheDocument()
    expect(screen.queryByText(/перегенерац/i)).not.toBeInTheDocument()
  })
})
