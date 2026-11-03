import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContactAdmin } from './ContactAdmin'
import { SUPPORT_ADDRESS } from '../../utils/contactAdmin'

describe('ContactAdmin', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders link and fallback block immediately when message is undefined (fallback="always")', () => {
    render(<ContactAdmin fallback="always" />)

    const link = screen.getByRole('link', {
      name: /Написати адміністраторові платформи/i,
    })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining(`mailto:${SUPPORT_ADDRESS}`),
    )
    expect(link).not.toHaveAttribute('target')

    expect(
      screen.getByText(/Не відкрилася поштова програма\? Напишіть на/i),
    ).toBeInTheDocument()
    expect(screen.getByText(SUPPORT_ADDRESS)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Скопіювати адресу' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Скопіювати текст листа' }),
    ).toBeInTheDocument()
  })

  it('renders nothing when message is passed without the phrase', () => {
    const { container } = render(
      <ContactAdmin
        message="Файл завеликий. Зменште його або розділіть на частини."
        fallback="after-click"
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when message is empty string or whitespace without the phrase', () => {
    const { container } = render(
      <ContactAdmin message="" fallback="after-click" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('with phrase: link is visible, fallback is hidden until clicked, then appears with address text', () => {
    render(
      <ContactAdmin
        message="Не вдалося зберегти назву — спробуйте ще раз. Якщо повториться, напишіть нам."
        fallback="after-click"
      />,
    )

    const link = screen.getByRole('link', {
      name: /Написати адміністраторові платформи/i,
    })
    expect(link).toBeInTheDocument()
    expect(
      screen.queryByText(/Не відкрилася поштова програма\? Напишіть на/i),
    ).toBeNull()

    fireEvent.click(link)

    expect(
      screen.getByText(/Не відкрилася поштова програма\? Напишіть на/i),
    ).toBeInTheDocument()
    expect(screen.getByText(SUPPORT_ADDRESS)).toBeInTheDocument()
  })

  it('button "Скопіювати адресу" calls navigator.clipboard.writeText with support@pythoncourse.me', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(<ContactAdmin fallback="always" />)

    const copyBtn = screen.getByRole('button', { name: 'Скопіювати адресу' })
    fireEvent.click(copyBtn)

    expect(writeTextMock).toHaveBeenCalledWith(SUPPORT_ADDRESS)
    expect(
      await screen.findByRole('button', { name: 'Скопійовано!' }),
    ).toBeInTheDocument()
  })

  it('button "Скопіювати текст листа" copies the letter body', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ContactAdmin
        message="Якщо повториться, напишіть нам."
        fallback="always"
      />,
    )

    const copyBodyBtn = screen.getByRole('button', {
      name: 'Скопіювати текст листа',
    })
    fireEvent.click(copyBodyBtn)

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('Якщо повториться, напишіть нам.'),
    )
    expect(
      await screen.findByRole('button', { name: 'Скопійовано!' }),
    ).toBeInTheDocument()
  })

  it('shows fallback textarea with letter body when clipboard copy fails', async () => {
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new Error('Clipboard forbidden'))
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ContactAdmin
        message="Помилка завантаження, напишіть нам."
        fallback="always"
      />,
    )

    expect(
      screen.queryByText(
        'Не вдалося скопіювати — виділіть текст і скопіюйте вручну',
      ),
    ).toBeNull()

    const copyBtn = screen.getByRole('button', { name: 'Скопіювати адресу' })
    fireEvent.click(copyBtn)

    expect(
      await screen.findByText(
        'Не вдалося скопіювати — виділіть текст і скопіюйте вручну',
      ),
    ).toBeInTheDocument()

    const textarea = screen.getByRole('textbox', { name: 'Текст листа' })
    expect(textarea).toBeInTheDocument()
    expect((textarea as HTMLTextAreaElement).value).toContain(
      'Помилка завантаження, напишіть нам.',
    )
  })

  it('neither clicking link nor copying triggers fetch', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    render(
      <ContactAdmin
        message="Якщо повториться, напишіть нам."
        fallback="after-click"
      />,
    )

    const link = screen.getByRole('link', {
      name: /Написати адміністраторові платформи/i,
    })
    fireEvent.click(link)

    const copyAddressBtn = screen.getByRole('button', {
      name: 'Скопіювати адресу',
    })
    fireEvent.click(copyAddressBtn)

    const copyBodyBtn = screen.getByRole('button', {
      name: 'Скопіювати текст листа',
    })
    fireEvent.click(copyBodyBtn)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders compact mode with compact classes', () => {
    render(
      <ContactAdmin
        message="Якщо повториться, напишіть нам."
        fallback="after-click"
        compact
      />,
    )

    const link = screen.getByRole('link', {
      name: /Написати адміністраторові платформи/i,
    })
    expect(link).toHaveClass('text-navy')
    expect(link).toHaveClass('underline')
  })
})
