import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { WrittenTestResponse } from '../types/api'

// The shell's activity strip and the boot-time language prefetch: nothing
// reaches the network.
vi.mock('../api/jobs', () => ({
  jobsApi: {
    history: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 }),
    list: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    get: vi.fn(),
  },
}))
vi.mock('../utils/languages', () => ({
  getLanguages: vi.fn().mockResolvedValue([]),
  getCachedLanguages: vi.fn().mockReturnValue(null),
  findLanguage: vi.fn().mockReturnValue(null),
}))

// The test routes, mocked by the repository's custom — no msw; the refusal
// reader stays the real one.
const tests = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  replace: vi.fn(),
  replaceWithYaml: vi.fn(),
  check: vi.fn(),
  publish: vi.fn(),
  exportYaml: vi.fn(),
}))
vi.mock('../api/tests', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/tests')>()),
  testsApi: tests,
}))
const nodes = vi.hoisted(() => ({ getNode: vi.fn() }))
vi.mock('../api/nodes', () => ({ nodesApi: nodes }))
const documents = vi.hoisted(() => ({ delete: vi.fn() }))
vi.mock('../api/documents', () => ({ documentsApi: documents }))

// Where the editor sends the author: markers, not the pages.
vi.mock('./CoursePage', () => ({ CoursePage: () => <h1>page: course</h1> }))
vi.mock('./DashboardPage', () => ({
  DashboardPage: () => <h1>page: courses</h1>,
}))
vi.mock('./LoginPage', () => ({ LoginPage: () => <h1>page: login</h1> }))

import { ApiError } from '../api/client'
import { createAppRouter } from '../router'
import { useAuthStore } from '../stores/auth'

function renderAt(path: string) {
  const router = createAppRouter((routes) =>
    createMemoryRouter(routes, { initialEntries: [path] }),
  )
  const view = render(<RouterProvider router={router} />)
  return { router, unmount: view.unmount }
}

const TWO_QUESTIONS: WrittenTestResponse['draft'] = {
  pass_threshold: 60,
  questions: [
    {
      number: '1',
      text: 'Що виведе print(1 + 1)?',
      options: [
        { label: 'а', text: '2', correct: true },
        { label: 'б', text: '11', correct: false },
      ],
      explanation: null,
    },
    {
      number: '2',
      text: 'Яке ім’я змінної неправильне?',
      options: [
        { label: 'а', text: 'total', correct: false },
        { label: 'б', text: '2total', correct: true },
      ],
      explanation: null,
    },
  ],
}

// A test as its reading answers: a draft of two questions, never published,
// not checked yet.
function reading(more: Partial<WrittenTestResponse> = {}): WrittenTestResponse {
  return {
    id: 't1',
    course_node_id: 'n1',
    title: 'Змінні',
    language: 'ukr',
    draft: TWO_QUESTIONS,
    published: null,
    course_root_id: 'r1',
    unpublished_changes: true,
    incomplete: [],
    check: { state: 'not_checked', explanations: {}, doubts: {} },
    ...more,
  }
}

const READY = {
  state: 'ready' as const,
  explanations: {
    '1': 'Додаються числа, а не рядки, тож print виведе 2.',
    '2': 'Ім’я змінної не може починатися цифрою.',
  },
  doubts: { '2': true },
}

const VERSION = { number: 1, version: 'v1', published_at: '2026-09-28T10:00:00Z' }

function card(number: number): HTMLElement {
  return screen.getByRole('region', { name: `Питання ${number}` })
}

function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}

async function openTest(more: Partial<WrittenTestResponse> = {}) {
  tests.get.mockResolvedValue(reading(more))
  const rendered = renderAt('/test/t1/edit')
  await screen.findByRole('region', { name: 'Питання 1' })
  return rendered
}

describe('TestEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ apiKey: 'cs_live_key', connected: false })
    nodes.getNode.mockResolvedValue({ id: 'r1', default_language: 'ukr' })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a new test from its title and moves to its address', async () => {
    tests.create.mockResolvedValue(
      reading({
        id: 't-new',
        draft: {
          pass_threshold: null,
          questions: [{ number: '1', text: '', options: [], explanation: null }],
        },
      }),
    )
    const { router } = renderAt('/test/new?node=n1&course=r1')

    const title = await screen.findByLabelText('Назва тесту')
    expect(title).toHaveFocus()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Новий тест')
    // Without a title nothing is sent: the page says so next to the field.
    fireEvent.click(button('Додати питання'))
    fireEvent.click(button('Зберегти чернетку'))
    expect(await screen.findByText('Впишіть назву тесту.')).toBeInTheDocument()
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(tests.create).not.toHaveBeenCalled()

    fireEvent.change(title, { target: { value: ' Змінні ' } })
    fireEvent.click(button('Зберегти чернетку'))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/test/t-new/edit'),
    )
    expect(router.state.historyAction).toBe('REPLACE')
    expect(tests.create).toHaveBeenCalledWith('n1', {
      title: 'Змінні',
      questions: [{ text: '', options: [] }],
    })
    expect(
      screen.getByText(
        'Тест створено. Студенти не побачать його, доки ви його не опублікуєте.',
      ),
    ).toBeInTheDocument()
    // The page moved with the test: nothing read again, nothing asked on leaving.
    expect(tests.get).not.toHaveBeenCalled()
  })

  it('saves an edited draft and shows that everything is saved', async () => {
    await openTest()
    expect(screen.getByText('Усі зміни збережено')).toBeInTheDocument()
    tests.replace.mockImplementation(async (_id: string, body: unknown) => {
      const sent = body as { questions: { text: string }[] }
      return reading({
        draft: {
          ...TWO_QUESTIONS,
          questions: TWO_QUESTIONS.questions.map((question, index) => ({
            ...question,
            text: sent.questions[index]!.text,
          })),
        },
      })
    })

    fireEvent.change(within(card(1)).getByLabelText('Текст питання'), {
      target: { value: ' Що виведе print(2 + 2)? ' },
    })
    expect(screen.getByText('Є незбережені зміни')).toBeInTheDocument()
    fireEvent.click(button('Зберегти чернетку'))

    expect(await screen.findByText('Чернетку збережено.')).toBeInTheDocument()
    expect(tests.replace).toHaveBeenCalledWith('t1', {
      title: 'Змінні',
      pass_threshold: 60,
      questions: [
        {
          text: 'Що виведе print(2 + 2)?',
          options: [
            { text: '2', correct: true },
            { text: '11', correct: false },
          ],
        },
        {
          text: 'Яке ім’я змінної неправильне?',
          options: [
            { text: 'total', correct: false },
            { text: '2total', correct: true },
          ],
        },
      ],
    })
    expect(screen.getByText('Усі зміни збережено')).toBeInTheDocument()
    expect(button('Немає змін')).toBeDisabled()
    expect(within(card(1)).getByLabelText('Текст питання')).toHaveValue(
      'Що виведе print(2 + 2)?',
    )
  })

  it('shows a refusal next to the question and the option it names', async () => {
    await openTest()
    // The backend's own refusal of an option 501 characters long.
    tests.replace.mockRejectedValue(
      new ApiError(422, 'API error 422', {
        detail: {
          code: 'TEST_FIELD_INVALID',
          details: 'question 2, option 2: text has 501 characters; at most 500',
          place: { line: null, column: null, question: 2, option: 2 },
        },
      }),
    )
    fireEvent.change(within(card(2)).getByLabelText('Текст варіанта б'), {
      target: { value: '2total — з цифри' },
    })
    fireEvent.click(button('Зберегти чернетку'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Чернетку не збережено: виправте позначене червоним нижче.',
    )
    const option = within(card(2)).getByLabelText('Текст варіанта б')
    expect(option).toHaveAttribute('aria-invalid', 'true')
    expect(option).toHaveAccessibleDescription(
      'Цей текст не вдалося зберегти: перевірте, чи він не задовгий.',
    )
    await waitFor(() => expect(option).toHaveFocus())
    // The other option of the question is left alone, and the draft too.
    expect(within(card(2)).getByLabelText('Текст варіанта а')).not.toHaveAttribute(
      'aria-invalid',
    )
    expect(option).toHaveValue('2total — з цифри')
  })

  it('keeps check and publish unavailable while changes are unsaved or the test is unfinished, and says why', async () => {
    // A new test: nothing to check or publish before it is saved.
    const fresh = renderAt('/test/new?node=n1&course=r1')
    await screen.findByLabelText('Назва тесту')
    expect(button('Перевірити моделлю')).toBeDisabled()
    expect(button('Опублікувати')).toHaveAccessibleDescription(
      'Спершу збережіть тест.',
    )
    fresh.unmount()

    // Unfinished: each place says what is missing; both actions wait for it.
    const unfinished = await openTest({
      draft: {
        pass_threshold: null,
        questions: [{ number: '1', text: 'Що?', options: [], explanation: null }],
      },
    })
    expect(button('Перевірити моделлю')).toHaveAccessibleDescription(
      'Щоб перевірити чи опублікувати тест, завершіть позначені місця.',
    )
    expect(button('Опублікувати')).toBeDisabled()
    expect(
      within(card(1)).getByText('Додайте варіанти: потрібно щонайменше два.'),
    ).toBeInTheDocument()
    unfinished.unmount()

    // A finished test with unsaved changes: saved first.
    await openTest()
    expect(button('Перевірити моделлю')).toBeEnabled()
    expect(button('Опублікувати')).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Назва тесту'), {
      target: { value: 'Змінні й типи' },
    })
    expect(button('Перевірити моделлю')).toBeDisabled()
    expect(button('Опублікувати')).toHaveAccessibleDescription(
      'Спершу збережіть зміни.',
    )
    expect(tests.check).not.toHaveBeenCalled()
  })

  it("orders a check, then shows the model's explanations and doubts by their questions", async () => {
    await openTest()
    tests.check.mockResolvedValue({ state: 'in_progress', explanations: {}, doubts: {} })
    tests.get.mockResolvedValue(reading({ check: READY }))

    fireEvent.click(button('Перевірити моделлю'))

    expect(
      await screen.findByText(
        'Пояснення моделі готові: їх показано біля питань. Щодо деяких питань ' +
          'модель має сумнів — їх позначено.',
      ),
    ).toBeInTheDocument()
    expect(tests.check).toHaveBeenCalledWith('t1')
    expect(screen.getByText('Перевірено моделлю')).toBeInTheDocument()
    expect(
      within(card(1)).getByText('Додаються числа, а не рядки, тож print виведе 2.'),
    ).toBeInTheDocument()
    expect(within(card(1)).queryByText('Сумнів моделі')).toBeNull()
    expect(within(card(2)).getByText('Сумнів моделі')).toBeInTheDocument()
    expect(
      within(card(2)).getByText('Ім’я змінної не може починатися цифрою.'),
    ).toBeInTheDocument()
    // Checked: another check is not offered.
    expect(button('Перевірити моделлю')).toHaveAccessibleDescription(
      'Чернетку вже перевірено.',
    )
  })

  it('drops a poll answer that comes back while the draft is being saved', async () => {
    const RUNNING = { state: 'in_progress' as const, explanations: {}, doubts: {} }
    // The opening read; then the first poll of the running check, held back
    // until the save is under way.
    let answerPoll: (test: WrittenTestResponse) => void = () => {}
    tests.get
      .mockResolvedValueOnce(reading({ check: RUNNING }))
      .mockImplementationOnce(
        () => new Promise<WrittenTestResponse>((resolve) => (answerPoll = resolve)),
      )
    renderAt('/test/t1/edit')
    await screen.findByRole('region', { name: 'Питання 1' })
    await waitFor(() => expect(tests.get).toHaveBeenCalledTimes(2))

    let answerSave: (test: WrittenTestResponse) => void = () => {}
    tests.replace.mockImplementation(
      () => new Promise<WrittenTestResponse>((resolve) => (answerSave = resolve)),
    )
    fireEvent.change(screen.getByLabelText('Назва тесту'), {
      target: { value: 'Змінні й типи' },
    })
    fireEvent.click(button('Зберегти чернетку'))
    await waitFor(() => expect(tests.replace).toHaveBeenCalledTimes(1))

    // The poll comes back mid-save with what it read before the save: the old
    // title, and the check finished meanwhile. The page keeps what it has.
    await act(async () => answerPoll(reading({ check: READY })))
    expect(screen.getByText('Перевірка йде…')).toBeInTheDocument()
    expect(screen.queryByText('Перевірено моделлю')).toBeNull()
    expect(screen.queryByText(/Пояснення моделі готові/)).toBeNull()

    await act(async () =>
      answerSave(reading({ title: 'Змінні й типи', check: RUNNING })),
    )
    expect(screen.getByText('Чернетку збережено.')).toBeInTheDocument()
    expect(screen.getByText('Усі зміни збережено')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Змінні й типи' })).toBeInTheDocument()
    expect(screen.getByText('Перевірка йде…')).toBeInTheDocument()
  })

  it('keeps a newer save when a poll answer asked before it comes back after it', async () => {
    const RUNNING = { state: 'in_progress' as const, explanations: {}, doubts: {} }
    // The opening read; then the first poll of the running check, held back
    // until the save has answered.
    let answerPoll: (test: WrittenTestResponse) => void = () => {}
    tests.get
      .mockResolvedValueOnce(reading({ check: RUNNING }))
      .mockImplementationOnce(
        () => new Promise<WrittenTestResponse>((resolve) => (answerPoll = resolve)),
      )
    renderAt('/test/t1/edit')
    await screen.findByRole('region', { name: 'Питання 1' })
    await waitFor(() => expect(tests.get).toHaveBeenCalledTimes(2))

    tests.replace.mockResolvedValue(reading({ title: 'Змінні й типи', check: RUNNING }))
    fireEvent.change(screen.getByLabelText('Назва тесту'), {
      target: { value: 'Змінні й типи' },
    })
    fireEvent.click(button('Зберегти чернетку'))
    expect(await screen.findByText('Чернетку збережено.')).toBeInTheDocument()

    // Only now does the poll come back, with what it read before the save.
    await act(async () => answerPoll(reading({ check: RUNNING })))
    expect(screen.getByText('Усі зміни збережено')).toBeInTheDocument()
    expect(screen.queryByText('Є незбережені зміни')).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Змінні й типи' })).toBeInTheDocument()
  })

  it('sends no poll while a save is under way, so no answer can undo the newer save', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const RUNNING = { state: 'in_progress' as const, explanations: {}, doubts: {} }
      // The opening read and the first poll of the running check answer at
      // once. Any later poll — one asked during the save — would bring what the
      // server held before it, and come back only after the save has answered.
      let answerLatePoll: (test: WrittenTestResponse) => void = () => {}
      tests.get
        .mockImplementation(
          () => new Promise<WrittenTestResponse>((resolve) => (answerLatePoll = resolve)),
        )
        .mockResolvedValueOnce(reading({ check: RUNNING }))
        .mockResolvedValueOnce(reading({ check: RUNNING }))
      renderAt('/test/t1/edit')
      await screen.findByRole('region', { name: 'Питання 1' })
      await waitFor(() => expect(tests.get).toHaveBeenCalledTimes(2))

      let answerSave: (test: WrittenTestResponse) => void = () => {}
      tests.replace.mockImplementation(
        () => new Promise<WrittenTestResponse>((resolve) => (answerSave = resolve)),
      )
      fireEvent.change(screen.getByLabelText('Назва тесту'), {
        target: { value: 'Змінні й типи' },
      })
      fireEvent.click(button('Зберегти чернетку'))
      await waitFor(() => expect(tests.replace).toHaveBeenCalledTimes(1))

      // The poll's next step comes due while the save is under way.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000)
      })
      expect(tests.get).toHaveBeenCalledTimes(2)

      await act(async () =>
        answerSave(reading({ title: 'Змінні й типи', check: RUNNING })),
      )
      await act(async () => answerLatePoll(reading({ check: RUNNING })))
      expect(screen.getByText('Усі зміни збережено')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 1, name: 'Змінні й типи' }),
      ).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('explains a collision with a running check instead of failing silently', async () => {
    await openTest()
    tests.check.mockRejectedValue(
      new ApiError(409, 'API error 409', {
        detail: {
          code: 'GENERATION_IN_PROGRESS',
          details:
            'another job of this task is still running — its explanations being ' +
            'written, or the task itself being processed; nothing was saved, so ' +
            'send the request again once it finishes',
        },
      }),
    )

    fireEvent.click(button('Перевірити моделлю'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Попередня перевірка цього тесту ще триває. Спробуйте за хвилину — нічого не змінено.',
    )
    expect(screen.getByText('Не перевірено моделлю')).toBeInTheDocument()
  })

  it("copies the model's explanation into the author's own for editing, leaving the model's as it was", async () => {
    await openTest({ check: READY })
    const first = card(1)
    const model = 'Додаються числа, а не рядки, тож print виведе 2.'

    fireEvent.click(within(first).getByRole('button', { name: 'Взяти текст моделі за основу' }))
    const own = within(first).getByLabelText('Власне пояснення')
    expect(own).toHaveValue(model)
    await waitFor(() => expect(own).toHaveFocus())
    fireEvent.change(own, { target: { value: 'Python додає числа: 1 + 1 = 2.' } })
    expect(within(first).getByTestId('model-explanation')).toHaveTextContent(model)

    // Over the author's own words the page asks first.
    fireEvent.click(within(first).getByRole('button', { name: 'Взяти текст моделі за основу' }))
    const dialog = await screen.findByRole('dialog', { name: 'Замінити власне пояснення?' })
    expect(dialog).toHaveTextContent(
      'Текст моделі замінить ваше власне пояснення до питання 1. Зміну буде ' +
        'збережено разом із чернеткою.',
    )
    expect(own).toHaveValue('Python додає числа: 1 + 1 = 2.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Замінити' }))
    expect(own).toHaveValue(model)
    expect(within(first).getByTestId('model-explanation')).toHaveTextContent(model)
  })

  it('publishes a checked draft with a plain confirmation', async () => {
    await openTest({ check: READY })
    tests.publish.mockResolvedValue({ created: true, published: VERSION })
    tests.get.mockResolvedValue(
      reading({ check: READY, published: VERSION, unpublished_changes: false }),
    )

    fireEvent.click(button('Опублікувати'))
    const dialog = await screen.findByRole('dialog', { name: 'Опублікувати тест?' })
    expect(dialog).toHaveTextContent('Тест побачать студенти курсу.')
    expect(dialog).toHaveTextContent('Пояснення моделі вже готові.')
    expect(dialog).not.toHaveTextContent('Чернетку не перевірено моделлю')
    expect(tests.publish).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Опублікувати' }))

    expect(
      await screen.findByText('Опубліковано: студенти бачать цю версію тесту.'),
    ).toBeInTheDocument()
    expect(tests.publish).toHaveBeenCalledWith('t1')
    expect(screen.getByText('Опубліковано')).toBeInTheDocument()
    // The window animates out: until it is gone, its own "Опублікувати" is
    // on the page too.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(button('Опублікувати')).toHaveAccessibleDescription(
      'Змін після публікації немає.',
    )
  })

  it('warns before publishing an unchecked draft', async () => {
    await openTest()
    tests.publish.mockResolvedValue({ created: true, published: VERSION })
    tests.get.mockResolvedValue(
      reading({
        published: VERSION,
        unpublished_changes: false,
        check: { state: 'in_progress', explanations: {}, doubts: {} },
      }),
    )

    fireEvent.click(button('Опублікувати'))
    const dialog = await screen.findByRole('dialog', { name: 'Опублікувати тест?' })
    expect(dialog).toHaveTextContent(
      'Чернетку не перевірено моделлю: ви ще не бачили її пояснень і сумнівів. ' +
        "Пояснення з'являться за кілька хвилин після публікації; хто пройде тест " +
        'раніше, отримає оцінку без них.',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Опублікувати' }))

    expect(
      await screen.findByText(
        "Опубліковано: студенти бачать цю версію тесту. Пояснення моделі з'являться за кілька хвилин.",
      ),
    ).toBeInTheDocument()
  })

  it('marks unpublished changes and a published version', async () => {
    const never = await openTest()
    expect(screen.getByText('Не опубліковано')).toBeInTheDocument()
    expect(screen.queryByText('Є неопубліковані зміни')).toBeNull()
    never.unmount()

    const changed = await openTest({ published: VERSION, unpublished_changes: true })
    expect(screen.getByText('Опубліковано')).toHaveAttribute(
      'title',
      'Студенти бачать цю версію тесту',
    )
    expect(screen.getByText('Є неопубліковані зміни')).toHaveAttribute(
      'title',
      'Чернетка відрізняється від версії, яку бачать студенти',
    )
    expect(button('Опублікувати')).toBeEnabled()
    changed.unmount()

    await openTest({ published: VERSION, unpublished_changes: false })
    expect(screen.getByText('Опубліковано')).toBeInTheDocument()
    expect(screen.queryByText('Є неопубліковані зміни')).toBeNull()
    expect(button('Опублікувати')).toHaveAccessibleDescription(
      'Змін після публікації немає.',
    )
  })

  it('shows the test as a student sees it: letters, no marks, no explanations', async () => {
    await openTest({
      check: READY,
      draft: {
        ...TWO_QUESTIONS,
        questions: [
          { ...TWO_QUESTIONS.questions[0]!, explanation: 'Своє пояснення автора.' },
          TWO_QUESTIONS.questions[1]!,
        ],
      },
    })
    // An unsaved change shows too.
    fireEvent.change(within(card(2)).getByLabelText('Текст варіанта а'), {
      target: { value: 'total_sum' },
    })

    fireEvent.click(button('Як бачить студент'))

    expect(button('Як бачить студент')).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByText(
        'Так студенти побачать тест після публікації: без позначок правильних ' +
          'варіантів і без пояснень.',
      ),
    ).toBeInTheDocument()
    const first = screen.getByRole('group', { name: '1. Що виведе print(1 + 1)?' })
    expect(within(first).getByText('а) 2')).toBeInTheDocument()
    expect(within(first).getByText('б) 11')).toBeInTheDocument()
    const second = screen.getByRole('group', { name: '2. Яке ім’я змінної неправильне?' })
    expect(within(second).getByText('а) total_sum')).toBeInTheDocument()
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toBeChecked()
      expect(box).toBeDisabled()
    }
    expect(screen.queryByText('правильна')).toBeNull()
    expect(screen.queryByText('Своє пояснення автора.')).toBeNull()
    expect(screen.queryByText(READY.explanations['1'])).toBeNull()
    expect(screen.queryByText('Сумнів моделі')).toBeNull()
  })

  it('asks before leaving with unsaved changes and stays when asked to', async () => {
    const { router } = await openTest()
    fireEvent.change(screen.getByLabelText('Назва тесту'), {
      target: { value: 'Змінні й типи' },
    })

    // Closing the tab or reloading: the browser's own question.
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('link', { name: 'До курсу' }))
    let dialog = await screen.findByRole('dialog', { name: 'Піти без збереження?' })
    expect(dialog).toHaveTextContent('Зміни в тесті не збережено — їх буде втрачено.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Лишитися' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/test/t1/edit')
    expect(screen.getByLabelText('Назва тесту')).toHaveValue('Змінні й типи')

    fireEvent.click(screen.getByRole('link', { name: 'До курсу' }))
    dialog = await screen.findByRole('dialog', { name: 'Піти без збереження?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Піти без збереження' }))
    expect(await screen.findByRole('heading', { name: 'page: course' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/course/r1')
    expect(router.state.location.search).toBe('?selected=n1')
  })

  it("asks before logging out with unsaved changes, and logs out only when told to", async () => {
    const { router } = await openTest()
    fireEvent.change(screen.getByLabelText('Назва тесту'), {
      target: { value: 'Змінні й типи' },
    })

    fireEvent.click(button('Вийти'))
    let dialog = await screen.findByRole('dialog', { name: 'Піти без збереження?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Лишитися' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(router.state.location.pathname).toBe('/test/t1/edit')
    expect(useAuthStore.getState().apiKey).toBe('cs_live_key')
    expect(screen.getByLabelText('Назва тесту')).toHaveValue('Змінні й типи')

    fireEvent.click(button('Вийти'))
    dialog = await screen.findByRole('dialog', { name: 'Піти без збереження?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Піти без збереження' }))
    expect(await screen.findByRole('heading', { name: 'page: login' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(useAuthStore.getState().apiKey).toBeNull()
  })

  it('moves questions and options with the arrows and relabels the options', async () => {
    await openTest()

    fireEvent.click(button('Перемістити питання 1 нижче'))
    expect(within(card(1)).getByLabelText('Текст питання')).toHaveValue(
      'Яке ім’я змінної неправильне?',
    )
    expect(within(card(2)).getByLabelText('Текст питання')).toHaveValue(
      'Що виведе print(1 + 1)?',
    )
    // The moved card is last now: focus stays on its arrow that still works.
    await waitFor(() => expect(button('Перемістити питання 2 вище')).toHaveFocus())
    expect(button('Перемістити питання 1 вище')).toBeDisabled()

    // Its second option up: the letters follow the order, and so does the mark.
    fireEvent.click(within(card(2)).getByRole('button', { name: 'Перемістити варіант б вище' }))
    expect(within(card(2)).getByLabelText('Текст варіанта а')).toHaveValue('11')
    expect(within(card(2)).getByLabelText('Текст варіанта б')).toHaveValue('2')
    expect(
      within(card(2)).getByRole('checkbox', { name: 'Варіант б — правильна відповідь' }),
    ).toBeChecked()
    await waitFor(() =>
      expect(
        within(card(2)).getByRole('button', { name: 'Перемістити варіант а нижче' }),
      ).toHaveFocus(),
    )
  })

  it('lets the correct mark be set from the keyboard and names it', async () => {
    await openTest()
    const box = within(card(1)).getByRole('checkbox', {
      name: 'Варіант б — правильна відповідь',
    })

    // A native box: Tab reaches it, and Space ticks it — the click it fires.
    expect(box).toHaveAttribute('type', 'checkbox')
    box.focus()
    expect(box).toHaveFocus()
    fireEvent.click(box)

    expect(box).toBeChecked()
    expect(within(card(1)).getAllByText('правильна')).toHaveLength(2)
    expect(screen.getByText('Є незбережені зміни')).toBeInTheDocument()
  })

  it('replaces the draft from a YAML file after a confirmation', async () => {
    await openTest()
    const input = screen.getByTestId('yaml-file')

    // Not a YAML file: said at once, nothing asked or sent.
    fireEvent.change(input, { target: { files: [new File(['x'], 'змінні.txt')] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Оберіть файл YAML (.yaml чи .yml).',
    )
    expect(screen.queryByRole('dialog')).toBeNull()

    const file = new File(['title: Змінні\nquestions: []\n'], 'змінні.yaml')
    tests.replaceWithYaml.mockResolvedValue(
      reading({
        draft: {
          pass_threshold: null,
          questions: [
            {
              number: '1',
              text: 'Питання з файла',
              options: [
                { label: 'а', text: 'так', correct: true },
                { label: 'б', text: 'ні', correct: false },
              ],
              explanation: null,
            },
          ],
        },
      }),
    )
    fireEvent.change(input, { target: { files: [file] } })
    const dialog = await screen.findByRole('dialog', { name: 'Замінити чернетку файлом?' })
    expect(dialog).toHaveTextContent('вмістом файла «змінні.yaml»')
    expect(tests.replaceWithYaml).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Замінити' }))

    expect(await screen.findByText('Чернетку замінено вмістом файла.')).toBeInTheDocument()
    expect(tests.replaceWithYaml).toHaveBeenCalledWith('t1', file)
    expect(within(card(1)).getByLabelText('Текст питання')).toHaveValue('Питання з файла')
    expect(screen.queryByRole('region', { name: 'Питання 2' })).toBeNull()
  })

  it('hides the test after a confirmation and returns to the course', async () => {
    const { router } = await openTest()
    documents.delete.mockResolvedValue(undefined)

    fireEvent.click(button('Приховати тест'))
    const dialog = await screen.findByRole('dialog', { name: 'Приховати тест?' })
    expect(dialog).toHaveTextContent(
      'Студенти більше не побачать тест «Змінні» у курсі. Спроби, які вже зроблено, ' +
        'збережуться. Скасувати приховування в програмі автора не можна.',
    )
    expect(documents.delete).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Приховати' }))

    expect(await screen.findByRole('heading', { name: 'page: course' })).toBeInTheDocument()
    expect(documents.delete).toHaveBeenCalledWith('t1')
    expect(router.state.location.pathname).toBe('/course/r1')
    expect(router.state.location.search).toBe('?selected=n1')
  })

  it('exports the saved draft as a YAML file named by the test', async () => {
    await openTest()
    tests.exportYaml.mockResolvedValue('title: Змінні\nquestions: []\n')
    const created = vi.fn(() => 'blob:test')
    const revoked = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: created, revokeObjectURL: revoked })
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    fireEvent.click(button('Вивантажити YAML'))

    await waitFor(() => expect(clicked).toHaveBeenCalledTimes(1))
    const link = clicked.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('Змінні.yaml')
    expect(link.href).toBe('blob:test')
    expect(tests.exportYaml).toHaveBeenCalledWith('t1')
    expect(revoked).toHaveBeenCalledWith('blob:test')
    vi.unstubAllGlobals()

    // Unsaved changes are not in the file: saved first.
    fireEvent.change(screen.getByLabelText('Назва тесту'), {
      target: { value: 'Змінні й типи' },
    })
    expect(button('Вивантажити YAML')).toHaveAccessibleDescription(
      'Спершу збережіть зміни.',
    )
  })
})
