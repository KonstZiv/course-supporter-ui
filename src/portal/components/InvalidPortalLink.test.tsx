import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PortalApp } from '../App'
import { BECOME_STUDENT_URL } from '../portalLinks'

// The portal's neutral page: what a stranger — a payment provider's reviewer
// among them — sees at the portal's root or at any address that is not a
// portal page. It explains, in the site's look, and asks nothing of the server.

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <PortalApp />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('InvalidPortalLink — the neutral page', () => {
  it.each(['/', '/not-a-uuid', '/not-a-uuid/home', '/019eda80-67ea-7060-b4c4-9dc85761690e/nope'])(
    'at %s: the texts of the page, word for word',
    (path) => {
      renderAt(path)
      expect(
        screen.getByRole('heading', { level: 1, name: 'Навчальний портал Course Supporter' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'Портал курсу відкривається за посиланням від автора курсу. Якщо ви студент, відкрийте посилання, яке дав вам автор.',
        ),
      ).toBeInTheDocument()
      const authors = screen.getByText(
        (_, node) =>
          node?.tagName === 'P' &&
          node.textContent === 'Ви автор курсу? Вхід для авторів — у програмі автора.',
      )
      expect(within(authors).getByRole('link', { name: 'програмі автора' })).toHaveAttribute(
        'href',
        'https://panel.pythoncourse.me/',
      )
    },
  )

  it('links "Як стати студентом" to the address of one constant', () => {
    renderAt('/')
    expect(BECOME_STUDENT_URL).toBe('https://pythoncourse.me/uk/')
    expect(screen.getByRole('link', { name: 'Як стати студентом' })).toHaveAttribute(
      'href',
      BECOME_STUDENT_URL,
    )
  })

  it('has the site header (prices, documentation) and footer', () => {
    renderAt('/')
    const header = screen.getByRole('navigation', { name: 'Основна навігація' })
    expect(within(header).getByRole('link', { name: 'Ціни' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/pricing/',
    )
    expect(within(header).getByRole('link', { name: 'Документація' })).toHaveAttribute(
      'href',
      'https://about.pythoncourse.me/uk/',
    )
    expect(screen.getByRole('navigation', { name: 'Правова інформація' })).toBeInTheDocument()
  })

  it('never names a teacher', () => {
    renderAt('/')
    expect(document.body.textContent).not.toMatch(/викладач/i)
  })

  it('asks the server nothing', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/not-a-uuid/home')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
