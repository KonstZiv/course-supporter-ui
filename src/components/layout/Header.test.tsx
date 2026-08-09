import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  )
}

describe('Header — history nav item (§3 c7, Г1)', () => {
  it('shows the ratified "Історія матеріалів" link, pointing at /history', () => {
    renderHeader()
    const link = screen.getByRole('link', { name: 'Історія матеріалів' })
    expect(link).toHaveAttribute('href', '/history')
  })

  it('places it last among the nav links (before the logout button)', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Історія матеріалів' }).closest('nav')!
    const links = Array.from(nav.querySelectorAll('a'))
    expect(links[links.length - 1]).toHaveAttribute('href', '/history')
  })

  it('marks the history item active on /history', () => {
    renderHeader('/history')
    expect(
      screen.getByRole('link', { name: 'Історія матеріалів' }).className,
    ).toContain('bg-navy-pale')
  })
})

describe('Header — nav compaction keeps the accessible name (§3 c7, clar.1/2)', () => {
  it('wraps the label so it collapses to the icon, but keeps the name in aria-label + title', () => {
    renderHeader()
    const link = screen.getByRole('link', { name: 'Історія матеріалів' })
    expect(link).toHaveAttribute('aria-label', 'Історія матеріалів')
    expect(link).toHaveAttribute('title', 'Історія матеріалів')
    const label = screen.getByText('Історія матеріалів')
    expect(label.className).toContain('hidden')
    expect(label.className).toContain('lg:inline')
  })

  it('collapses EVERY nav label at the same single breakpoint (no independent thresholds)', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Курси' }).closest('nav')!
    const labelSpans = Array.from(nav.querySelectorAll('span'))
    expect(labelSpans.length).toBe(6) // five links + logout
    labelSpans.forEach((s) => {
      expect(s.className).toContain('hidden')
      expect(s.className).toContain('lg:inline')
    })
  })
})
