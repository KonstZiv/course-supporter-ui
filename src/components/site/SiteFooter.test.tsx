import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SiteFooter } from './SiteFooter'

describe('SiteFooter', () => {
  it("leads to the site's legal pages", () => {
    render(<SiteFooter />)
    const legal = screen.getByRole('navigation', { name: 'Правова інформація' })
    const links = within(legal)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')])
    expect(links).toEqual([
      ['Умови користування', 'https://pythoncourse.me/uk/terms/'],
      ['Повернення оплати', 'https://pythoncourse.me/uk/refunds/'],
      ['Конфіденційність', 'https://pythoncourse.me/uk/privacy/'],
      ['Контакти', 'https://pythoncourse.me/uk/contact/'],
    ])
    for (const link of within(legal).getAllByRole('link')) {
      expect(link).not.toHaveAttribute('target')
    }
  })

  it('names the company and the support address', () => {
    render(<SiteFooter />)
    expect(screen.getByText('EXSOL DOO, Чорногорія')).toBeInTheDocument()
    expect(screen.getByText(/^Підтримка:/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'support@pythoncourse.me' })).toHaveAttribute(
      'href',
      'mailto:support@pythoncourse.me',
    )
  })
})
