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

  it('now sits second-to-last, after Довідка took the last slot (Є1)', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Історія матеріалів' }).closest('nav')!
    const links = Array.from(nav.querySelectorAll('a'))
    expect(links[links.length - 1]).toHaveAttribute('href', '/help')
    expect(links[links.length - 2]).toHaveAttribute('href', '/history')
  })

  it('marks the history item active on /history', () => {
    renderHeader('/history')
    expect(
      screen.getByRole('link', { name: 'Історія матеріалів' }).className,
    ).toContain('bg-navy-pale')
  })
})

describe('Header — help nav item (Є1)', () => {
  it('shows the "Довідка" link, pointing at /help', () => {
    renderHeader()
    const link = screen.getByRole('link', { name: 'Довідка' })
    expect(link).toHaveAttribute('href', '/help')
  })

  it('collapses to the icon below xl, keeping the name in aria-label + title', () => {
    renderHeader()
    const link = screen.getByRole('link', { name: 'Довідка' })
    expect(link).toHaveAttribute('aria-label', 'Довідка')
    expect(link).toHaveAttribute('title', 'Довідка')
    const label = screen.getByText('Довідка')
    expect(label.className).toContain('hidden')
    expect(label.className).toContain('xl:inline')
  })

  it('marks the help item active on /help (same active style as siblings)', () => {
    renderHeader('/help')
    expect(
      screen.getByRole('link', { name: 'Довідка' }).className,
    ).toContain('bg-navy-pale')
  })
})

describe('Header — units nav item (1Б)', () => {
  it('shows "Юніти", pointing at /billing, between Студенти and Витрати', () => {
    renderHeader()
    const link = screen.getByRole('link', { name: 'Юніти' })
    expect(link).toHaveAttribute('href', '/billing')
    expect(link).toHaveAttribute('title', 'Юніти')
    const nav = link.closest('nav')!
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/',
      '/students',
      '/billing',
      '/cost',
      '/cost/homework',
      '/history',
      '/help',
    ])
  })

  it('makes the nav eight controls: seven links and the logout', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Юніти' }).closest('nav')!
    expect(nav.querySelectorAll('a, button')).toHaveLength(8)
  })

  it('below sm the row scrolls inside itself without a bar; from sm it does not', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Юніти' }).closest('nav')!
    for (const token of [
      'min-w-0',
      'overflow-x-auto',
      '[scrollbar-width:none]',
      'sm:overflow-visible',
      'sm:shrink-0',
    ]) {
      expect(nav.className).toContain(token)
    }
  })

  it('gives every control px-2.5 from sm and px-4 from xl, where the labels show', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Юніти' }).closest('nav')!
    const controls = Array.from(nav.querySelectorAll('a, button'))
    expect(controls).toHaveLength(8)
    for (const control of controls) {
      expect(control.className).toContain('px-2')
      expect(control.className).toContain('sm:px-2.5')
      expect(control.className).toContain('xl:px-4')
      expect(control.className).not.toContain('sm:px-4')
    }
  })

  it('marks the units item active on /billing', () => {
    renderHeader('/billing')
    expect(screen.getByRole('link', { name: 'Юніти' }).className).toContain('bg-navy-pale')
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
    expect(label.className).toContain('xl:inline')
  })

  it('collapses EVERY nav label at the same single breakpoint (no independent thresholds)', () => {
    renderHeader()
    const nav = screen.getByRole('link', { name: 'Курси' }).closest('nav')!
    const labelSpans = Array.from(nav.querySelectorAll('span'))
    expect(labelSpans.length).toBe(8) // seven links + logout
    labelSpans.forEach((s) => {
      expect(s.className).toContain('hidden')
      expect(s.className).toContain('xl:inline')
    })
  })
})

describe('Header — visual pass (§ Г8)', () => {
  it('separates the central zone and the nav with a persistent divider (п.3)', () => {
    const { container } = renderHeader()
    const divider = container.querySelector('header .w-px')
    expect(divider).toBeTruthy()
    expect(divider).toHaveAttribute('aria-hidden')
  })

  it('gives the two cost items distinct icons — no money-icon collision (п.4)', () => {
    renderHeader()
    const cost = screen
      .getByRole('link', { name: 'Витрати' })
      .querySelector('svg')!
    const costHw = screen
      .getByRole('link', { name: 'Витрати ДЗ' })
      .querySelector('svg')!
    // Different lucide icons → different class token; they no longer merge as
    // icon-only ($ vs $-sheet).
    expect(cost.getAttribute('class')).not.toBe(costHw.getAttribute('class'))
  })
})
