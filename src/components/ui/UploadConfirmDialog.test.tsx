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

describe('UploadConfirmDialog — a YAML test (task 07c)', () => {
  it('explains a YAML file uploaded as a test and keeps its role educational', () => {
    const onConfirm = renderDialog([{ name: 'Змінні.YML', sourceType: 'code' }])
    // A methodological pick is set aside, not lost.
    fireEvent.click(screen.getByText('Методичний'))
    fireEvent.click(screen.getByRole('button', { name: 'Тест' }))

    expect(
      screen.getByText(
        'Тест із файла YAML: питання, варіанти й позначки буде прочитано з ' +
          'файла, сам файл не зберігається. Студенти побачать тест лише після ' +
          'публікації; відкрити його можна кнопкою «Відкрити тест» у рядку ' +
          'матеріалу.',
      ),
    ).toBeInTheDocument()
    // The code note would describe a different reading of the same file.
    expect(screen.queryByText(/Код-матеріал/)).toBeNull()
    const educational = screen.getByRole('button', { name: /Учбовий/ })
    const methodological = screen.getByRole('button', { name: /Методичний/ })
    expect(educational).toHaveAttribute('aria-pressed', 'true')
    expect(educational).toBeDisabled()
    expect(educational).toHaveAccessibleDescription('Тест завжди навчальний.')
    expect(methodological).toHaveAttribute('aria-pressed', 'false')
    expect(methodological).toBeDisabled()

    fireEvent.click(screen.getByText('Завантажити'))
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('educational', 'test', false)
  })

  it('does not upload a test from a file that is not YAML', () => {
    const refusal =
      'Тест завантажується лише файлом YAML (.yaml чи .yml). Оберіть інший ' +
      'вид завдання або завантажте файл YAML.'
    const onConfirm = renderDialog([
      { name: 'quiz.yaml', sourceType: 'code' },
      { name: 'quiz.json', sourceType: 'code' },
    ])
    fireEvent.click(screen.getByText('Учбовий'))
    fireEvent.click(screen.getByRole('button', { name: 'Тест' }))

    const upload = screen.getByRole('button', { name: 'Завантажити' })
    expect(upload).toBeDisabled()
    expect(upload).toHaveAccessibleDescription(refusal)
    // The author's own role stays theirs to change.
    expect(screen.getByRole('button', { name: /Методичний/ })).toBeEnabled()
    fireEvent.click(upload)
    expect(onConfirm).not.toHaveBeenCalled()

    // Another kind lifts the refusal.
    fireEvent.click(screen.getByRole('button', { name: 'Завдання' }))
    expect(screen.queryByText(refusal)).toBeNull()
    expect(upload).toBeEnabled()
  })

  it('does not upload a test from a link', () => {
    const onConfirm = vi.fn()
    render(
      <UploadConfirmDialog
        open
        files={[]}
        linkUrl="https://example.com/quiz.yaml"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Учбовий'))
    fireEvent.click(screen.getByRole('button', { name: 'Тест' }))

    expect(screen.getByRole('button', { name: 'Завантажити' })).toBeDisabled()
    expect(
      screen.getByText(/Тест завантажується лише файлом YAML/),
    ).toBeInTheDocument()
  })
})
