import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadConfirmDialog } from './UploadConfirmDialog'

// task-code-materials commit 8: the shared «Тип документа» dialog — the
// code axis (R6) and the defect-#10 description-only info region.

function renderDialog(
  files: { name: string; sourceType: string }[],
  onConfirm = vi.fn(),
) {
  render(
    <UploadConfirmDialog
      open
      files={files}
      onConfirm={onConfirm}
      onCancel={vi.fn()}
    />,
  )
  return onConfirm
}

describe('UploadConfirmDialog — code axis', () => {
  it('keeps the legacy shape for a plain text file (no toggle, no region)', () => {
    renderDialog([{ name: 'notes.md', sourceType: 'text' }])
    expect(screen.queryByText(/Це код-матеріал/)).toBeNull()
    expect(screen.queryByText(/залишаться лише згадкою/)).toBeNull()
  })

  it('shows the info region for auto-routed code files without a toggle', () => {
    renderDialog([{ name: 'project.zip', sourceType: 'code' }])
    expect(screen.queryByText(/Це код-матеріал/)).toBeNull()
    expect(screen.getByText(/залишаться лише згадкою/)).toBeTruthy()
  })

  it('locks the ratified code-material hint wording (product-language rule)', () => {
    renderDialog([{ name: 'project.zip', sourceType: 'code' }])
    expect(
      screen.getByText(/ваші власні файли увійдуть до уроку повністю/),
    ).toBeTruthy()
    expect(
      screen.getByText(/Після обробки ви зможете уточнити роль кожного файла/),
    ).toBeTruthy()
  })

  it('offers the html-as-code toggle and reveals the region when checked', () => {
    renderDialog([{ name: 'lesson.html', sourceType: 'text' }])
    const toggle = screen.getByRole('checkbox')
    expect(screen.queryByText(/залишаться лише згадкою/)).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByText(/залишаться лише згадкою/)).toBeTruthy()
  })

  it('passes asCode through onConfirm after a role is chosen', () => {
    const onConfirm = renderDialog([{ name: 'lesson.html', sourceType: 'text' }])
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText('Учбовий'))
    fireEvent.click(screen.getByText('Завантажити'))
    expect(onConfirm).toHaveBeenCalledWith('educational', null, true)
  })

  it('defaults asCode to false for ordinary uploads', () => {
    const onConfirm = renderDialog([{ name: 'slides.pdf', sourceType: 'presentation' }])
    fireEvent.click(screen.getByText('Методичний'))
    fireEvent.click(screen.getByText('Завантажити'))
    expect(onConfirm).toHaveBeenCalledWith('methodological', null, false)
  })
})
