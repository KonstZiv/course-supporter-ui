import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { NodeDetailPanel } from './NodeDetailPanel'
import { useCourseStore } from '../../stores/course'
import { documentsApi, type AuthoredDocumentCreateResponse } from '../../api/documents'
import { nodesApi } from '../../api/nodes'
import { ApiError } from '../../api/client'
import type { AuthoredDocumentSummary, NodeWithDocuments } from '../../types/api'

// NodeDetailPanel now calls useNavigate for the awaiting_author confirm entry —
// mock it so the bare render (no Router) works and the target is assertable.
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

// The link door calls ``documentsApi.uploadUrl``; mock the module so the
// rejection path is drivable. Other methods are unused no-ops here.
vi.mock('../../api/documents', () => ({
  documentsApi: {
    upload: vi.fn(),
    uploadUrl: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    retry: vi.fn(),
    update: vi.fn(),
    confirmFileRoles: vi.fn(),
    attachBase: vi.fn(),
    getBaseState: vi.fn(),
    getBaseManifest: vi.fn(),
    // Step Г2 §2.9: the structure block reads on MOUNT now, so every panel
    // render with a ready code material reaches this. Resolved empty — these
    // tests are about the card's other controls, and an empty answer draws no
    // block at all.
    getStructure: vi.fn().mockResolvedValue({
      excluded: [],
      description_only: [],
    }),
  },
}))

function makeNode(overrides: Partial<NodeWithDocuments> = {}): NodeWithDocuments {
  return {
    id: 'node-1',
    parent_id: null,
    title: 'Node',
    description: null,
    default_language: 'ukr',
    order: 0,
    content_hash: null,
    summary_status: 'none',
    materials_changed: false,
    authored_documents: [],
    children: [],
    ...overrides,
  }
}

function seed(node: NodeWithDocuments): void {
  useCourseStore.setState({
    tree: node,
    selectedNodeId: node.id,
    loading: false,
    error: null,
  })
}

function makeDoc(
  overrides: Partial<AuthoredDocumentSummary> = {},
): AuthoredDocumentSummary {
  return {
    id: 'doc-1',
    course_node_id: 'node-1',
    source_type: 'code',
    material_role: 'educational',
    task_type: null,
    order: 0,
    filename: 'lesson.zip',
    title: null,
    source_url: 's3://bucket/lesson.zip',
    language: 'ukr',
    state: 'ready',
    processing_phase: 'awaiting_author',
    content_fingerprint: null,
    error_message: null,
    error_category: null,
    created_at: '',
    ...overrides,
  }
}

describe('NodeDetailPanel — summary affordance (Task 3.2.5b c2)', () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
  })

  const LABEL = 'Переглянути/редагувати опис'

  it('hides the review/edit button when summary_status is "none"', () => {
    seed(makeNode({ summary_status: 'none' }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.queryByText(LABEL)).not.toBeInTheDocument()
  })

  it('shows the button for a draft summary', () => {
    seed(makeNode({ summary_status: 'draft' }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText(LABEL)).toBeInTheDocument()
  })

  it('shows the button for an approved summary', () => {
    seed(makeNode({ summary_status: 'approved' }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText(LABEL)).toBeInTheDocument()
  })

  it('lifts the node id + title to onOpenSummary on click', () => {
    const onOpen = vi.fn()
    seed(
      makeNode({ id: 'node-xyz', title: 'Вузол XYZ', summary_status: 'approved' }),
    )
    render(<NodeDetailPanel onOpenSummary={onOpen} />)
    fireEvent.click(screen.getByText(LABEL))
    expect(onOpen).toHaveBeenCalledExactlyOnceWith('node-xyz', 'Вузол XYZ')
  })
})

describe('NodeDetailPanel — awaiting_author entry (№21 UI2)', () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
    navigateMock.mockReset()
  })

  it('shows the awaiting-author badge and a confirm entry for that phase', () => {
    seed(makeNode({ authored_documents: [makeDoc()] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText('Очікує підтвердження')).toBeInTheDocument()
    expect(screen.getByText('Підтвердити ролі')).toBeInTheDocument()
  })

  it('navigates to the confirm screen on click', () => {
    seed(makeNode({ authored_documents: [makeDoc({ id: 'doc-xyz' })] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.click(screen.getByText('Підтвердити ролі'))
    expect(navigateMock).toHaveBeenCalledWith('/document/doc-xyz/confirm-roles')
  })

  it('shows no confirm entry for a non-awaiting document (tolerance)', () => {
    seed(
      makeNode({
        authored_documents: [
          makeDoc({ state: 'ready', processing_phase: 'ready' }),
        ],
      }),
    )
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(screen.queryByText('Підтвердити ролі')).not.toBeInTheDocument()
  })
})

describe("NodeDetailPanel — a material's role", () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
  })

  it('calls the roles «навчальний» and «методичний»', () => {
    seed(
      makeNode({
        authored_documents: [
          makeDoc({ id: 'doc-1', filename: 'lesson.pdf', processing_phase: 'ready' }),
          makeDoc({
            id: 'doc-2',
            filename: 'plan.pdf',
            material_role: 'methodological',
            processing_phase: 'ready',
          }),
        ],
      }),
    )
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    expect(screen.getByText('📚 навчальний')).toBeInTheDocument()
    expect(screen.getByText('📋 методичний')).toBeInTheDocument()
  })
})

describe('NodeDetailPanel — link rejection is shown, never swallowed', () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
    vi.clearAllMocks()
  })

  // Drive the URL door end to end: type a link, open the «Тип документа»
  // dialog, pick a role, confirm — the same steps the author performs.
  function addLinkThroughDialog(url: string): void {
    seed(makeNode())
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)
    fireEvent.change(
      screen.getByPlaceholderText('https://youtu.be/... або URL'),
      { target: { value: url } },
    )
    fireEvent.click(screen.getByText('Додати'))
    fireEvent.click(screen.getByText('Навчальний'))
    fireEvent.click(screen.getByText('Завантажити'))
  }

  it('surfaces the server reason (video past the duration cap)', async () => {
    vi.mocked(documentsApi.uploadUrl).mockRejectedValue(
      new ApiError(400, 'API error 400', {
        detail: {
          code: 'INTAKE_DURATION_EXCEEDED',
          category: 'duration_limit',
          details:
            'Система обробляє відео тривалістю до 150 хвилин; це відео — 180 хв.',
        },
      }),
    )
    addLinkThroughDialog('https://youtu.be/long')
    // Step Г2 §2.5: the link door and the file door answer on ONE surface —
    // the author has one place to look, whichever way the material came in.
    await waitFor(() =>
      expect(
        screen.getByText(
          'Система обробляє відео тривалістю до 150 хвилин; це відео — 180 хв.',
        ),
      ).toBeInTheDocument(),
    )
  })

  it('falls back to a product-language message when no reason is given', async () => {
    vi.mocked(documentsApi.uploadUrl).mockRejectedValue(
      new ApiError(400, 'API error 400', null),
    )
    addLinkThroughDialog('https://youtu.be/x')
    await waitFor(() =>
      expect(
        screen.getByText(
          'Не вдалося додати матеріал за посиланням. Спробуйте ще раз.',
        ),
      ).toBeInTheDocument(),
    )
  })

  it('the reason stays until the author closes it', async () => {
    vi.mocked(documentsApi.uploadUrl).mockRejectedValue(
      new ApiError(400, 'API error 400', null),
    )
    addLinkThroughDialog('https://youtu.be/x')
    await screen.findByText(
      'Не вдалося додати матеріал за посиланням. Спробуйте ще раз.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Закрити' }))
    expect(
      screen.queryByText(
        'Не вдалося додати матеріал за посиланням. Спробуйте ще раз.',
      ),
    ).not.toBeInTheDocument()
  })
})

describe('NodeDetailPanel — a test written in the system (task 07c)', () => {
  beforeEach(() => {
    useCourseStore.getState().reset()
    vi.clearAllMocks()
    navigateMock.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // A test as the tree carries it: named by its title, no file, the service
  // link every written test shares, ready from its first moment.
  function makeTest(
    overrides: Partial<AuthoredDocumentSummary> = {},
  ): AuthoredDocumentSummary {
    return makeDoc({
      id: 'test-1',
      source_type: 'test_object',
      task_type: 'test',
      filename: null,
      title: 'Змінні',
      source_url: 'test-object:',
      state: 'ready',
      processing_phase: 'ready',
      ...overrides,
    })
  }

  const LESSON = makeDoc({
    id: 'doc-2',
    source_type: 'presentation',
    filename: 'lesson.pdf',
    source_url: 's3://bucket/lesson.pdf',
    state: 'ready',
    processing_phase: 'ready',
  })

  // The row of one material: its actions live beside the name.
  function rowOf(name: string): HTMLElement {
    return screen.getByText(name).closest('.group') as HTMLElement
  }

  it('shows a test by its title with an open button and without reprocessing or a role switch', () => {
    seed(makeNode({ authored_documents: [makeTest()] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)

    const row = rowOf('Змінні')
    expect(screen.queryByText('test-object:')).toBeNull()
    // Its own icon, not the generic file.
    expect(row.querySelector('.lucide-list-checks')).not.toBeNull()
    // Never processed: no «Готово», nothing to reprocess, a fixed role.
    expect(within(row).queryByText('Готово')).toBeNull()
    expect(within(row).queryByTitle('Натисніть щоб змінити тип')).toBeNull()
    expect(within(row).queryByTitle('Повторити обробку')).toBeNull()
    expect(within(row).queryByTitle('Перезапустити обробку (force)')).toBeNull()
    expect(
      within(row).getByRole('button', { name: 'Приховати тест' }),
    ).toBeInTheDocument()

    fireEvent.click(within(row).getByRole('button', { name: 'Відкрити тест' }))
    expect(navigateMock).toHaveBeenCalledWith('/test/test-1/edit')
  })

  it('asks before hiding a test, naming what students lose and keep', async () => {
    const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
    seed(makeNode({ authored_documents: [makeTest()] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Приховати тест' }))
    expect(ask).toHaveBeenCalledExactlyOnceWith(
      'Приховати тест «Змінні»? Студенти більше не побачать його в курсі; ' +
        'спроби, які вже зроблено, збережуться. Скасувати приховування в ' +
        'програмі автора не можна.',
    )
    expect(documentsApi.delete).not.toHaveBeenCalled()

    ask.mockReturnValue(true)
    vi.mocked(documentsApi.delete).mockResolvedValue(undefined)
    vi.spyOn(nodesApi, 'getDetail').mockResolvedValue(makeNode())
    fireEvent.click(screen.getByRole('button', { name: 'Приховати тест' }))

    await waitFor(() => expect(screen.queryByText('Змінні')).toBeNull())
    expect(documentsApi.delete).toHaveBeenCalledExactlyOnceWith('test-1')
  })

  it('shows a refused reprocessing instead of swallowing it', async () => {
    seed(
      makeNode({
        authored_documents: [
          makeDoc({
            id: 'doc-err',
            source_type: 'presentation',
            filename: 'lesson.pdf',
            source_url: 's3://bucket/lesson.pdf',
            state: 'error',
            processing_phase: 'error',
            error_message: 'conversion failed',
          }),
        ],
      }),
    )
    vi.mocked(documentsApi.retry).mockRejectedValue(
      new ApiError(409, 'API error 409', null),
    )
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Повторити обробку' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(
      'Не вдалося запустити обробку «lesson.pdf». Спробуйте ще раз; якщо ' +
        'повториться, напишіть нам.',
    )
    expect(documentsApi.retry).toHaveBeenCalledExactlyOnceWith('doc-err', false)
    fireEvent.click(
      within(notice).getByRole('button', { name: 'Закрити повідомлення' }),
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows a refused hiding or deletion instead of swallowing it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(documentsApi.delete).mockRejectedValue(new TypeError('Failed to fetch'))
    seed(makeNode({ authored_documents: [makeTest(), LESSON] }))
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Приховати тест' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не вдалося приховати тест «Змінні». Спробуйте ще раз.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Видалити' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Не вдалося видалити «lesson.pdf». Спробуйте ще раз.',
      ),
    )
    // Both rows are still there: nothing was hidden or deleted.
    expect(screen.getByText('Змінні')).toBeInTheDocument()
    expect(screen.getByText('lesson.pdf')).toBeInTheDocument()
  })

  it('opens a new test in the editor from the panel', () => {
    const section = makeNode({ id: 'node-2', parent_id: 'root-1', title: 'Розділ' })
    useCourseStore.setState({
      tree: makeNode({ id: 'root-1', children: [section] }),
      selectedNodeId: 'node-2',
      loading: false,
      error: null,
    })
    render(<NodeDetailPanel onOpenSummary={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Новий тест' }))

    expect(navigateMock).toHaveBeenCalledExactlyOnceWith(
      '/test/new?node=node-2&course=root-1',
    )
  })

  it('uploads a YAML file as a test and shows it by its title, with no work to follow', async () => {
    seed(makeNode())
    const answer: AuthoredDocumentCreateResponse = {
      id: 'test-1',
      course_node_id: 'node-1',
      source_type: 'test_object',
      material_role: 'educational',
      task_type: 'test',
      source_url: 'test-object:',
      filename: null,
      language: 'ukr',
      order: 0,
      state: 'ready',
      processing_phase: 'ready',
      job_id: null,
      warnings: [],
      processing_estimate: null,
      created_at: '',
    }
    vi.mocked(documentsApi.upload).mockResolvedValue(answer)
    vi.spyOn(nodesApi, 'getDetail').mockResolvedValue(
      makeNode({ authored_documents: [makeTest()] }),
    )
    const { container } = render(<NodeDetailPanel onOpenSummary={vi.fn()} />)

    // The visible picker; the drop area keeps its own hidden input first.
    const picker = container.querySelectorAll('input[type=file]')[1]!
    const file = new File(['title: Змінні\n'], 'quiz.yaml', {
      type: 'application/yaml',
    })
    fireEvent.change(picker, { target: { files: [file] } })
    fireEvent.click(await screen.findByRole('button', { name: 'Тест' }))
    expect(screen.getByText('Тест завжди навчальний.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Завантажити' }))

    expect(
      await screen.findByRole('button', { name: 'Відкрити тест' }),
    ).toBeInTheDocument()
    expect(documentsApi.upload).toHaveBeenCalledExactlyOnceWith(
      'node-1',
      file,
      'code',
      'educational',
      null,
      'test',
      expect.any(Function),
    )
    expect(screen.getByText('Змінні')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
