import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HelpPage } from './HelpPage'
import { SUPPORT_ADDRESS } from '../utils/contactAdmin'

const DOCUMENTATION_URLS = new Set([
  'https://about.pythoncourse.me/uk/authors/',
  'https://about.pythoncourse.me/uk/authors/how-it-works/',
  'https://about.pythoncourse.me/uk/authors/first-course/',
  'https://about.pythoncourse.me/uk/authors/structure/',
  'https://about.pythoncourse.me/uk/authors/materials/',
  'https://about.pythoncourse.me/uk/authors/tasks/',
  'https://about.pythoncourse.me/uk/authors/tests/',
  'https://about.pythoncourse.me/uk/authors/methodist/#when',
  'https://about.pythoncourse.me/uk/authors/methodist/#edit',
  'https://about.pythoncourse.me/uk/authors/costs-history/',
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
      'Коли залито все, запустіть Методиста для всього курсу — Описи розділів: Методист.',
    )
    expect(items[6]).toHaveTextContent(
      'Перегляньте описи розділів, виправте, що треба, і затвердьте — там само.',
    )
    expect(items[7]).toHaveTextContent(
      'Додайте студентів і зарахуйте їх на курс.',
    )
    expect(items[8]).toHaveTextContent(
      'Стежте за витратами — Витрати й історія.',
    )
  })

  it('every documentation link has target="_blank", rel with noopener and noreferrer, and points to one of the documentation URLs', () => {
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
      expect(DOCUMENTATION_URLS.has(href)).toBe(true)
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

  it('renders steps 6 and 7 links to methodist sections', () => {
    const { container } = render(<HelpPage />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const items = ol!.querySelectorAll('li')

    const step6Link = items[5]!.querySelector('a')
    expect(step6Link).not.toBeNull()
    expect(step6Link).toHaveAttribute(
      'href',
      'https://about.pythoncourse.me/uk/authors/methodist/#when',
    )
    expect(step6Link).toHaveAttribute('target', '_blank')
    const step6Rel = step6Link?.getAttribute('rel') ?? ''
    expect(step6Rel).toContain('noopener')
    expect(step6Rel).toContain('noreferrer')

    const step7Link = items[6]!.querySelector('a')
    expect(step7Link).not.toBeNull()
    expect(step7Link).toHaveAttribute(
      'href',
      'https://about.pythoncourse.me/uk/authors/methodist/#edit',
    )
    expect(step7Link).toHaveAttribute('target', '_blank')
    const step7Rel = step7Link?.getAttribute('rel') ?? ''
    expect(step7Rel).toContain('noopener')
    expect(step7Rel).toContain('noreferrer')
  })

  it('renders step 9 link to the costs page and a note about step 8 only', () => {
    const { container } = render(<HelpPage />)
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    const items = ol!.querySelectorAll('li')

    const step9Link = items[8]!.querySelector('a')
    expect(step9Link).not.toBeNull()
    expect(step9Link).toHaveAttribute(
      'href',
      'https://about.pythoncourse.me/uk/authors/costs-history/',
    )
    expect(step9Link).toHaveAttribute('target', '_blank')
    const step9Rel = step9Link?.getAttribute('rel') ?? ''
    expect(step9Rel).toContain('noopener')
    expect(step9Rel).toContain('noreferrer')

    expect(items[7]!.querySelector('a')).toBeNull()
    expect(
      screen.getByText('Сторінка про крок 8 ще готується.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/кроки 8–9/)).toBeNull()
    expect(screen.queryByText(/кроки 6–9/)).toBeNull()
  })
})
