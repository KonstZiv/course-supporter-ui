import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { FlowContextMenu } from './FlowContextMenu'
import { nodesApi } from '../../api/nodes'
import { documentsApi } from '../../api/documents'
import { ApiError } from '../../api/client'
import { useCourseStore } from '../../stores/course'
import type { AuthoredDocumentResponse, NodeWithDocuments } from '../../types/api'

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
    pickFiles([sized('deck.pptx', 51 * 1024 * 1024)])
    // Step Г2 §2.5: shown on the canvas itself, where the author is standing,
    // instead of a browser modal that blocks the page and forgets its text.
    await waitFor(() =>
      expect(
        screen.getByText(/deck\.pptx перевищує ліміт 50 МБ для презентацій/),
      ).toBeInTheDocument(),
    )
    // The «Тип документа» dialog never opens for the rejected file.
    expect(screen.queryByText('Тип документа')).not.toBeInTheDocument()
  })

  it('the refusal stays until the author closes it', async () => {
    pickFiles([sized('deck.pptx', 51 * 1024 * 1024)])
    const notice = await screen.findByText(
      /deck\.pptx перевищує ліміт 50 МБ для презентацій/,
    )
    expect(notice).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Закрити' }))
    expect(
      screen.queryByText(/deck\.pptx перевищує ліміт/),
    ).not.toBeInTheDocument()
  })

  it('opens the «Тип документа» dialog for an accepted file', async () => {
    pickFiles([sized('notes.txt', 16)])
    await waitFor(() =>
      expect(screen.getByText('Тип документа')).toBeInTheDocument(),
    )
  })
})

describe('FlowContextMenu — rename failure is visible (pre-network / CORS)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a human message, keeps the modal open, and preserves the typed input on failure', async () => {
    vi.spyOn(nodesApi, 'update').mockRejectedValue(
      new TypeError('Failed to fetch'),
    )
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{ x: 0, y: 0, nodeId: 'n1', nodeTitle: 'Стара назва', isRoot: false }}
          onClose={vi.fn()}
          onGenerate={vi.fn()}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Перейменувати'))
    fireEvent.change(screen.getByDisplayValue('Стара назва'), {
      target: { value: 'Нова назва' },
    })
    fireEvent.click(screen.getByText('Зберегти'))

    await waitFor(() =>
      expect(screen.getByText(/Не вдалося зберегти назву/)).toBeInTheDocument(),
    )
    // Modal stays open with the typed value preserved (no retype needed).
    expect(screen.getByDisplayValue('Нова назва')).toBeInTheDocument()
    expect(screen.getByText('Зберегти')).toBeInTheDocument()
  })

  it('shows the description-drift hint after a title change and closes only on dismiss', async () => {
    useCourseStore.setState({ tree: null })
    vi.spyOn(nodesApi, 'update').mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof nodesApi.update>>,
    )
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{ x: 0, y: 0, nodeId: 'n1', nodeTitle: 'Стара', isRoot: false }}
          onClose={onClose}
          onGenerate={vi.fn()}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Перейменувати'))
    fireEvent.change(screen.getByDisplayValue('Стара'), {
      target: { value: 'Нова' },
    })
    fireEvent.click(screen.getByText('Зберегти'))

    await waitFor(() =>
      expect(
        screen.getByText(/Опис вузла не оновиться автоматично/),
      ).toBeInTheDocument(),
    )
    // The menu stays open until the author acknowledges the hint.
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Зрозуміло'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('FlowContextMenu — a test from the node menu (task 07c)', () => {
  afterEach(() => {
    useCourseStore.getState().reset()
    vi.restoreAllMocks()
  })

  // Where the router went, shown on the page.
  function Location() {
    const location = useLocation()
    return <p>at: {location.pathname + location.search}</p>
  }

  it('opens a new test in the editor from the node menu', () => {
    useCourseStore.setState({ tree: { id: 'root-1' } as NodeWithDocuments })
    const onClose = vi.fn()
    render(
      <MemoryRouter initialEntries={['/course/root-1']}>
        <Routes>
          <Route
            path="/course/:id"
            element={
              <FlowContextMenu
                position={{ x: 0, y: 0, nodeId: 'n7', nodeTitle: 'Розділ', isRoot: false }}
                onClose={onClose}
                onGenerate={vi.fn()}
              />
            }
          />
          <Route path="/test/new" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Новий тест' }))

    expect(
      screen.getByText('at: /test/new?node=n7&course=root-1'),
    ).toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('FlowContextMenu — «Обробити матеріали» starts failed materials only (answer 23.2)', () => {
  beforeEach(() => {
    useCourseStore.setState({ tree: { id: 'root-1' } as NodeWithDocuments })
    vi.spyOn(nodesApi, 'getDetail').mockResolvedValue({
      id: 'root-1',
    } as NodeWithDocuments)
  })
  afterEach(() => {
    useCourseStore.getState().reset()
    vi.restoreAllMocks()
  })

  function doc(over: Partial<AuthoredDocumentResponse>): AuthoredDocumentResponse {
    return {
      id: 'd',
      course_node_id: 'n1',
      course_root_id: 'root-1',
      source_type: 'presentation',
      material_role: 'educational',
      task_type: null,
      order: 0,
      filename: 'lesson.pdf',
      title: null,
      source_url: 's3://bucket/lesson.pdf',
      language: 'ukr',
      state: 'ready',
      processing_phase: 'ready',
      file_roles: null,
      job_id: null,
      error_message: null,
      error_category: null,
      created_at: '',
      updated_at: '',
      ...over,
    }
  }

  const FAILED = doc({
    id: 'failed-1',
    filename: 'broken.pdf',
    state: 'error',
    processing_phase: 'error',
    error_message: 'conversion failed',
  })
  const READY = doc({ id: 'ready-1', filename: 'lesson.pdf' })
  // Written in the system, never processed: ready from its first moment.
  const TEST = doc({
    id: 'test-1',
    source_type: 'test_object',
    task_type: 'test',
    filename: null,
    title: 'Змінні',
    source_url: 'test-object:',
  })

  // The author clicks elsewhere only once the window is up. It is up when it
  // has taken focus: that happens in the same round of effects in which the
  // menu's click guard learns about the window. A click fired as soon as the
  // window is in the page can come before that round, and the menu would
  // then close as if no window were open.
  async function clickElsewhereWhenShown(dialog: HTMLElement) {
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement),
    )
    fireEvent.mouseDown(document.body)
  }

  function openMenu(onClose = vi.fn()) {
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{ x: 0, y: 0, nodeId: 'n1', nodeTitle: 'Розділ', isRoot: false }}
          onClose={onClose}
          onGenerate={vi.fn()}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Обробити матеріали'))
    return onClose
  }

  it('processes only failed materials, skipping tests and ready ones', async () => {
    vi.spyOn(documentsApi, 'list').mockResolvedValue([READY, TEST, FAILED])
    const retry = vi.spyOn(documentsApi, 'retry').mockResolvedValue({ job_id: 'j1' })

    const onClose = openMenu()

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(documentsApi.list).toHaveBeenCalledWith('n1')
    expect(retry).toHaveBeenCalledExactlyOnceWith('failed-1')
    expect(nodesApi.getDetail).toHaveBeenCalledWith('root-1')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lists what was refused', async () => {
    const second = doc({
      id: 'failed-2',
      filename: null,
      title: null,
      source_url: 'https://example.com/article',
      source_type: 'web',
      state: 'error',
      processing_phase: 'error',
      error_message: 'fetch failed',
    })
    vi.spyOn(documentsApi, 'list').mockResolvedValue([FAILED, second])
    const retry = vi
      .spyOn(documentsApi, 'retry')
      .mockRejectedValueOnce(new ApiError(409, 'API error 409', null))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const onClose = openMenu()

    const notice = await screen.findByRole('dialog', {
      name: 'Не все вдалося запустити',
    })
    // One refusal did not stop the other.
    expect(retry).toHaveBeenCalledTimes(2)
    expect(within(notice).getAllByRole('listitem').map((i) => i.textContent)).toEqual([
      'broken.pdf — не вдалося запустити обробку — спробуйте ще раз',
      'https://example.com/article — не вдалося запустити обробку — спробуйте ще раз',
    ])
    // A click elsewhere does not take the answer away before it is read.
    await clickElsewhereWhenShown(notice)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(within(notice).getByRole('button', { name: 'Зрозуміло' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('says so when no material has failed', async () => {
    vi.spyOn(documentsApi, 'list').mockResolvedValue([READY, TEST])
    const retry = vi.spyOn(documentsApi, 'retry')

    const onClose = openMenu()

    const notice = await screen.findByRole('dialog', { name: 'Обробити матеріали' })
    expect(notice).toHaveTextContent(
      'Матеріалів із помилкою в цьому розділі немає. Готовий матеріал ' +
        'обробляють наново кнопкою в його рядку.',
    )
    expect(retry).not.toHaveBeenCalled()
    await clickElsewhereWhenShown(notice)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(within(notice).getByRole('button', { name: 'Зрозуміло' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('says in its help that it starts failed materials only', () => {
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{ x: 0, y: 0, nodeId: 'n1', nodeTitle: 'Розділ', isRoot: false }}
          onClose={vi.fn()}
          onGenerate={vi.fn()}
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getAllByRole('button', { name: 'Детальніше' })[0]!)

    const help = screen.getByRole('dialog', { name: 'Шар 1 + 2: Обробка матеріалів' })
    expect(help).toHaveTextContent(
      'Цей пункт повторює обробку матеріалів, що завершилася помилкою. ' +
        'Готовий матеріал обробляють наново кнопкою в його рядку.',
    )
    expect(help).not.toHaveTextContent('примусово')
  })
})
