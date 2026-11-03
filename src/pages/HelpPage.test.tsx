import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HelpPage } from './HelpPage'
import { SUPPORT_ADDRESS } from '../utils/contactAdmin'

const SEVEN_DOCUMENTATION_URLS = new Set([
  'https://about.pythoncourse.me/uk/authors/',
  'https://about.pythoncourse.me/uk/authors/how-it-works/',
  'https://about.pythoncourse.me/uk/authors/first-course/',
  'https://about.pythoncourse.me/uk/authors/structure/',
  'https://about.pythoncourse.me/uk/authors/materials/',
  'https://about.pythoncourse.me/uk/authors/tasks/',
  'https://about.pythoncourse.me/uk/authors/tests/',
])

describe('HelpPage', () => {
  it('renders page title and subtitle', () => {
    render(<HelpPage />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Довідка' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Шлях автора за кроками й допомога'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Цей розділ ще готується.')).toBeNull()
  })

  it('renders a numbered list of nine author steps', () => {
    const { container } = render(<HelpPage />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const items = ol!.querySelectorAll('li')
    expect(items).toHaveLength(9)

    expect(items[0]).toHaveTextContent(
      'Увійдіть у програму автора ключем доступу — Вхід і перший курс.',
    )
    expect(items[1]).toHaveTextContent(
      'Створіть курс і вкажіть його мову — там само.',
    )
    expect(items[2]).toHaveTextContent(
      'Створіть розділи курсу — одразу в тому порядку, у якому їх має бачити студент: Структура курсу.',
    )
    expect(items[3]).toHaveTextContent(
      'Завантажте в кожен розділ матеріали: навчальні — для студентів, методичні — для помічників платформи: Матеріали.',
    )
    expect(items[4]).toHaveTextContent(
      'Додайте завдання й тести: Завдання, Тести.',
    )
    expect(items[5]).toHaveTextContent(
      'Коли залито все, запустіть Методиста для всього курсу.',
    )
    expect(items[6]).toHaveTextContent(
      'Перегляньте описи розділів, виправте, що треба, і затвердьте.',
    )
    expect(items[7]).toHaveTextContent(
      'Додайте студентів і зарахуйте їх на курс.',
    )
    expect(items[8]).toHaveTextContent('Стежте за витратами.')
  })

  it('every documentation link has target="_blank", rel with noopener and noreferrer, and points to one of the 7 section 2 URLs', () => {
    render(<HelpPage />)
    const allLinks = screen.getAllByRole('link')
    const httpLinks = allLinks.filter(
      (link) => link.getAttribute('href')?.startsWith('http') ?? false,
    )

    expect(httpLinks.length).toBeGreaterThan(0)

    for (const link of httpLinks) {
      const href = link.getAttribute('href')!
      expect(
        href.startsWith('https://about.pythoncourse.me/uk/'),
        `Forbidden external link: ${href}`,
      ).toBe(true)
      expect(SEVEN_DOCUMENTATION_URLS.has(href)).toBe(true)
      expect(link).toHaveAttribute('target', '_blank')
      const rel = link.getAttribute('rel') ?? ''
      expect(rel).toContain('noopener')
      expect(rel).toContain('noreferrer')
    }
  })

  it('has exactly one mailto link on the contact admin button', () => {
    render(<HelpPage />)
    const allLinks = screen.getAllByRole('link')
    const mailtoLinks = allLinks.filter(
      (link) => link.getAttribute('href')?.startsWith('mailto:') ?? false,
    )

    expect(mailtoLinks).toHaveLength(1)
    expect(mailtoLinks[0]).toHaveAttribute(
      'href',
      expect.stringContaining(`mailto:${SUPPORT_ADDRESS}?subject=`),
    )
    expect(mailtoLinks[0]).toHaveTextContent(
      'Написати адміністраторові платформи',
    )
  })

  it('renders fallback contact block and address text immediately', () => {
    render(<HelpPage />)
    expect(
      screen.getByText(/Не відкрилася поштова програма\? Напишіть на/i),
    ).toBeInTheDocument()
    expect(screen.getByText(SUPPORT_ADDRESS)).toBeInTheDocument()
  })

  it('contains the access key warning', () => {
    render(<HelpPage />)
    expect(
      screen.getByText(/Ключа доступу не надсилайте ніколи/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Ключа доступу не надсилайте ніколи — ні в листі, ні на кадрі екрана.',
        { exact: false },
      ),
    ).toBeInTheDocument()
  })
})
