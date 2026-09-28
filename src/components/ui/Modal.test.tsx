import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Modal } from './Modal'

// A page that opens the window from a button, as every consumer does.
function Page({ withField = false }: { withField?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Відкрити
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Новий курс">
        {withField && <input aria-label="Назва" autoFocus />}
        <button type="button">Скасувати</button>
        <button type="button">Створити</button>
      </Modal>
    </>
  )
}

// A page that removes the window while it is open, as SummaryModal's is.
function PageThatUnmounts() {
  const [shown, setShown] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setShown(true)}>
        Відкрити
      </button>
      {shown && (
        <Modal open onClose={() => setShown(false)} title="Зведення">
          <button type="button" onClick={() => setShown(false)}>
            Прибрати
          </button>
        </Modal>
      )}
    </>
  )
}

function openFrom(name = 'Відкрити') {
  const opener = screen.getByRole('button', { name })
  opener.focus()
  fireEvent.click(opener)
  return opener
}

describe('Modal', () => {
  it('is a dialog named by its title', () => {
    render(
      <Modal open onClose={() => {}} title="Новий курс">
        <p>зміст</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Новий курс' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // The title stays one text element, as its consumers find it.
    expect(screen.getByText('Новий курс').tagName).toBe('H2')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Новий курс">
        <p>зміст</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus inside, keeping a field that asked for it', () => {
    const { unmount } = render(<Page />)
    openFrom()
    // No field asked for focus: the panel takes it, not the close button.
    expect(screen.getByRole('dialog')).toHaveFocus()
    unmount()

    render(<Page withField />)
    openFrom()
    expect(screen.getByRole('textbox', { name: 'Назва' })).toHaveFocus()
  })

  it('keeps Tab inside while open', () => {
    render(<Page />)
    openFrom()
    const close = screen.getByRole('button', { name: 'Закрити вікно' })
    const create = screen.getByRole('button', { name: 'Створити' })

    create.focus()
    fireEvent.keyDown(create, { key: 'Tab' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(create).toHaveFocus()

    // From the panel itself, Shift+Tab goes to the last control too.
    screen.getByRole('dialog').focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true })
    expect(create).toHaveFocus()
  })

  it('returns focus to what opened it, also when unmounted', () => {
    const { unmount } = render(<Page />)
    const opener = openFrom()
    fireEvent.click(screen.getByRole('button', { name: 'Закрити вікно' }))
    expect(opener).toHaveFocus()
    unmount()

    // A field that takes focus as the window opens does not become its opener.
    const { unmount: unmountWithField } = render(<Page withField />)
    const openerOfField = openFrom()
    fireEvent.click(screen.getByRole('button', { name: 'Закрити вікно' }))
    expect(openerOfField).toHaveFocus()
    unmountWithField()

    render(<PageThatUnmounts />)
    const unmountingOpener = openFrom()
    fireEvent.click(screen.getByRole('button', { name: 'Прибрати' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(unmountingOpener).toHaveFocus()
  })

  it('names its close button', () => {
    render(
      <Modal open onClose={() => {}} title="Новий курс">
        <p>зміст</p>
      </Modal>,
    )
    const close = screen.getByRole('button', { name: 'Закрити вікно' })
    expect(close).toHaveAttribute('type', 'button')
  })
})
