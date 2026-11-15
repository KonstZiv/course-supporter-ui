import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader', () => {
  it("leads to the site by the logo and shows the page's links in order", () => {
    render(
      <SiteHeader
        links={[
          { label: 'Ціни', href: 'https://pythoncourse.me/uk/pricing/' },
          { label: 'Документація', href: 'https://about.pythoncourse.me/uk/authors/' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Course Supporter' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/',
    )
    const nav = screen.getByRole('navigation')
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Ціни', 'https://pythoncourse.me/uk/pricing/'],
      ['Документація', 'https://about.pythoncourse.me/uk/authors/'],
    ])
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('shows the logo alone when the page passes no links', () => {
    render(<SiteHeader links={[]} />)
    expect(screen.getByRole('link', { name: 'Course Supporter' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).toBeNull()
  })
})
