import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FlowContextMenu } from './FlowContextMenu'

describe('FlowContextMenu — generate trigger', () => {
  it('lifts onGenerate with node id + title and closes the menu', () => {
    const onGenerate = vi.fn()
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{
            x: 10,
            y: 10,
            nodeId: 'node-7',
            nodeTitle: 'Розділ 3',
            isRoot: false,
          }}
          onClose={onClose}
          onGenerate={onGenerate}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Згенерувати опис'))

    expect(onGenerate).toHaveBeenCalledWith('node-7', 'Розділ 3')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('FlowContextMenu — upload parity with the side panel (Е2)', () => {
  let pickerInputs: HTMLInputElement[]
  let createSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    pickerInputs = []
    const realCreate = document.createElement.bind(document)
    createSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(((tag: string) => {
        const el = realCreate(tag)
        if (tag === 'input') {
          // No-op the OS file dialog; capture the picker so the test drives it.
          ;(el as HTMLInputElement).click = () => {}
          pickerInputs.push(el as HTMLInputElement)
        }
        return el
      }) as typeof document.createElement)
  })
  afterEach(() => {
    createSpy.mockRestore()
    vi.restoreAllMocks()
  })

  function sized(name: string, size: number): File {
    const f = new File(['x'], name)
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  function pickFiles(files: File[]): void {
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{ x: 0, y: 0, nodeId: 'n1', nodeTitle: 'N', isRoot: false }}
          onClose={vi.fn()}
          onGenerate={vi.fn()}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Завантажити матеріал'))
    const input = pickerInputs[pickerInputs.length - 1]!
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    input.onchange?.(new Event('change'))
  }

  it('runs the shared pre-send checks — an oversized presentation is rejected before the dialog', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    pickFiles([sized('deck.pptx', 51 * 1024 * 1024)])
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'deck.pptx перевищує ліміт 50 МБ для презентацій',
        ),
      ),
    )
    // The «Тип документа» dialog never opens for the rejected file.
    expect(screen.queryByText('Тип документа')).not.toBeInTheDocument()
  })

  it('opens the «Тип документа» dialog for an accepted file', async () => {
    pickFiles([sized('notes.txt', 16)])
    await waitFor(() =>
      expect(screen.getByText('Тип документа')).toBeInTheDocument(),
    )
  })
})
