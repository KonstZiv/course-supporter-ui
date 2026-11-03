import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadFailuresView } from './UploadFailuresView'
import { SUPPORT_ADDRESS } from '../../utils/contactAdmin'

describe('UploadFailuresView', () => {
  it('renders ContactAdmin button when failure message contains the phrase', () => {
    const onDismiss = vi.fn()
    const failureMsg =
      'Не вдалося обробити цей матеріал — спробуйте ще раз. Якщо повториться, напишіть нам, ми розберемося.'

    render(
      <UploadFailuresView
        failures={[failureMsg]}
        onDismiss={onDismiss}
        context={{ course: 'Тестовий курс', section: 'Тестовий розділ' }}
      />,
    )

    expect(screen.getByText('Файл не завантажено')).toBeInTheDocument()
    expect(screen.getByText(failureMsg)).toBeInTheDocument()

    const link = screen.getByRole('link', {
      name: /Написати адміністраторові платформи/i,
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(`mailto:${SUPPORT_ADDRESS}?subject=`),
    )

    const href = link.getAttribute('href')!
    const body = decodeURIComponent(href.slice(href.indexOf('&body=') + 6))
    expect(body).toContain(failureMsg)
    expect(body).toContain('Курс: Тестовий курс')
    expect(body).toContain('Розділ: Тестовий розділ')
  })

  it('does not render ContactAdmin button when failure message does not contain the phrase', () => {
    const onDismiss = vi.fn()
    const normalMsg = 'Файл завеликий. Зменште його або розділіть на частини.'

    render(
      <UploadFailuresView
        failures={[normalMsg]}
        onDismiss={onDismiss}
        context={{ course: 'Тестовий курс' }}
      />,
    )

    expect(screen.getByText(normalMsg)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: /Написати адміністраторові платформи/i,
      }),
    ).toBeNull()
  })

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn()
    render(
      <UploadFailuresView
        failures={['Помилка']}
        onDismiss={onDismiss}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Закрити' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
