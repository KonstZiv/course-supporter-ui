import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { PortalTestForm } from './PortalTestForm'
import { submissionCodePhrase } from '../submissionCodes'
import { portalApi, PortalApiError } from '../api/portalClient'
import { resetPortalLanguages } from '../languages'
import type { PortalMe, TestStructureResponse } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      testStructure: vi.fn(),
      submitTest: vi.fn(),
      // The review-language field reads these two on mount, as the file
      // form's does; mocked so the suite makes no real calls.
      languages: vi.fn(),
      me: vi.fn(),
    },
  }
})

const mockedStructure = vi.mocked(portalApi.testStructure)
const mockedSubmitTest = vi.mocked(portalApi.submitTest)
const mockedLanguages = vi.mocked(portalApi.languages)
const mockedMe = vi.mocked(portalApi.me)

// What the structure route serves: the version is the task's content hash, and
// numbers and labels are the author's own as the parser reads them — a
// one-letter label without its closing parenthesis (``а``, not ``а)``).
const VERSION = '0a80a922' + '5e'.repeat(28)
const TEST: TestStructureResponse = {
  version: VERSION,
  accepting_answers: true,
  questions: [
    {
      number: '1',
      text: 'Що виведе print(2 ** 3)?',
      options: [
        { label: 'а', text: '6' },
        { label: 'б', text: '8' },
        { label: 'в', text: '9' },
      ],
    },
    {
      number: '2',
      text: 'Які з типів незмінні? Правильних кілька.',
      options: [
        { label: 'а', text: 'tuple' },
        { label: 'б', text: 'list' },
        { label: 'в', text: 'str' },
      ],
    },
    {
      number: '3',
      text: 'Яке ключове слово оголошує функцію?',
      options: [
        { label: 'а', text: 'func' },
        { label: 'б', text: 'def' },
      ],
    },
  ],
}

const LANGUAGES = [
  { code: 'ukr', name_en: 'Ukrainian', name_native: 'українська' },
  { code: 'eng', name_en: 'English', name_native: 'English' },
]

const me = (over: Partial<PortalMe> = {}): PortalMe => ({
  student_id: 's1',
  tenant_id: 't1',
  login: 'olena',
  display_name: 'Олена',
  recovery_email: null,
  recovery_email_confirmed: false,
  preferred_language: null,
  ...over,
})

function renderForm(listedIds: string[] = [], courseLanguage: string | null = 'ukr') {
  const onSubmitted = vi.fn()
  const view = render(
    <PortalTestForm
      taskId="task-1"
      courseLanguage={courseLanguage}
      listedIds={listedIds}
      onSubmitted={onSubmitted}
    />,
  )
  const relist = (ids: string[]) =>
    view.rerender(
      <PortalTestForm
        taskId="task-1"
        courseLanguage={courseLanguage}
        listedIds={ids}
        onSubmitted={onSubmitted}
      />,
    )
  return { onSubmitted, relist }
}

const box = (name: string) => screen.getByRole('checkbox', { name })
const sendBtn = () => screen.getByRole('button', { name: /надіслати відповіді/i })
const loaded = () => screen.findByRole('checkbox', { name: 'а) 6' })

// Ticks one option in every question, so nothing is left for the
// confirmation to ask about.
function answerAll() {
  fireEvent.click(box('б) 8'))
  fireEvent.click(box('а) tuple'))
  fireEvent.click(box('в) str'))
  fireEvent.click(box('б) def'))
}

describe('PortalTestForm — прапорці й подача', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    mockedStructure.mockResolvedValue(TEST)
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedMe.mockResolvedValue(me())
  })

  it('shows every question and puts a checkbox on every option, as the test prints them', async () => {
    renderForm()
    await loaded()
    expect(mockedStructure).toHaveBeenCalledWith('task-1')
    expect(screen.getByText('1. Що виведе print(2 ** 3)?')).toBeInTheDocument()
    expect(screen.getByText('2. Які з типів незмінні? Правильних кілька.')).toBeInTheDocument()
    expect(screen.getByText('3. Яке ключове слово оголошує функцію?')).toBeInTheDocument()
    // Nothing of the key reaches the form, so no question gets radio buttons
    // or a count: every option of every question is a checkbox (decision 22).
    expect(screen.getAllByRole('checkbox')).toHaveLength(8)
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    for (const name of ['а) 6', 'б) 8', 'в) 9', 'а) tuple', 'б) list', 'в) str', 'а) func', 'б) def']) {
      expect(box(name)).not.toBeChecked()
    }
  })

  it('sends all the answers in one submission, with the version they were given to', async () => {
    mockedSubmitTest.mockResolvedValue({ submission_id: 'sub-1', status: 'received', duplicate: false })
    renderForm()
    await loaded()
    fireEvent.click(box('б) 8'))
    fireEvent.click(box('а) tuple'))
    fireEvent.click(box('б) list'))
    fireEvent.click(box('в) str'))
    fireEvent.click(box('б) list')) // a second click takes the tick back
    fireEvent.click(box('б) def'))
    expect(box('б) list')).not.toBeChecked()
    fireEvent.click(sendBtn())
    await waitFor(() => expect(mockedSubmitTest).toHaveBeenCalledTimes(1))
    expect(mockedSubmitTest).toHaveBeenCalledWith('task-1', {
      answers: { '1': ['б'], '2': ['а', 'в'], '3': ['б'] },
      test_version: VERSION,
      response_language: 'ukr',
    })
  })

  it('after the submission hands over to the attempts list, as for a file', async () => {
    mockedSubmitTest.mockResolvedValue({ submission_id: 'sub-1', status: 'received', duplicate: false })
    const { onSubmitted, relist } = renderForm()
    await loaded()
    answerAll()
    fireEvent.click(sendBtn())
    await waitFor(() =>
      expect(screen.getByText('Відповіді надіслано — очікують перевірки.')).toBeInTheDocument(),
    )
    expect(onSubmitted).toHaveBeenCalledWith('sub-1')
    expect(box('б) 8')).not.toBeChecked()
    // The notice lives until the list below shows the attempt it announces.
    relist(['sub-1'])
    await waitFor(() =>
      expect(screen.queryByText('Відповіді надіслано — очікують перевірки.')).not.toBeInTheDocument(),
    )
  })

  it('sends the stored preference as the review language', async () => {
    mockedMe.mockResolvedValue(me({ preferred_language: 'eng' }))
    mockedSubmitTest.mockResolvedValue({ submission_id: 'sub-1', status: 'received', duplicate: false })
    renderForm()
    await loaded()
    await waitFor(() => expect(screen.getByLabelText('Мова рецензії')).toHaveValue('eng'))
    answerAll()
    fireEvent.click(sendBtn())
    await waitFor(() => expect(mockedSubmitTest).toHaveBeenCalledTimes(1))
    expect(mockedSubmitTest.mock.calls[0]![1].response_language).toBe('eng')
  })

  it('says so when the test cannot be read', async () => {
    mockedStructure.mockRejectedValue(new PortalApiError(404, 'x', { detail: 'Task not found.' }))
    renderForm()
    await waitFor(() =>
      expect(screen.getByText('Не вдалося завантажити тест. Оновіть сторінку.')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Task not found.')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})

describe('PortalTestForm — підтвердження для питань без позначки', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    mockedStructure.mockResolvedValue(TEST)
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedMe.mockResolvedValue(me())
    mockedSubmitTest.mockResolvedValue({ submission_id: 'sub-1', status: 'received', duplicate: false })
  })

  it('asks first, naming the questions left blank and that they count as wrong', async () => {
    renderForm()
    await loaded()
    fireEvent.click(box('б) 8'))
    fireEvent.click(sendBtn())
    const dialog = await screen.findByRole('alertdialog', { name: 'Підтвердження подачі' })
    expect(
      within(dialog).getByText(
        'Без відповіді лишились питання 2, 3 — вони зарахуються як неправильні.',
      ),
    ).toBeInTheDocument()
    expect(mockedSubmitTest).not.toHaveBeenCalled()
  })

  it('names a single blank question in the singular', async () => {
    renderForm()
    await loaded()
    fireEvent.click(box('б) 8'))
    fireEvent.click(box('а) tuple'))
    fireEvent.click(sendBtn())
    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText(
        'Без відповіді лишилось питання 3 — воно зарахується як неправильне.',
      ),
    ).toBeInTheDocument()
    expect(mockedSubmitTest).not.toHaveBeenCalled()
  })

  it('going back leaves the student in the form, with the ticks and nothing sent', async () => {
    renderForm()
    await loaded()
    fireEvent.click(box('б) 8'))
    fireEvent.click(sendBtn())
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Повернутися до тесту' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(box('б) 8')).toBeChecked()
    expect(sendBtn()).toBeEnabled()
    expect(mockedSubmitTest).not.toHaveBeenCalled()
  })

  it('sending anyway sends the blank questions as empty lists', async () => {
    renderForm()
    await loaded()
    fireEvent.click(box('б) 8'))
    fireEvent.click(sendBtn())
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Надіслати все одно' }))
    await waitFor(() => expect(mockedSubmitTest).toHaveBeenCalledTimes(1))
    expect(mockedSubmitTest.mock.calls[0]![1].answers).toEqual({ '1': ['б'], '2': [], '3': [] })
  })
})

describe('PortalTestForm — тест ще не приймає відповідей', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    mockedStructure.mockResolvedValue({ ...TEST, accepting_answers: false })
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedMe.mockResolvedValue(me())
  })

  it('shows the test and says it is not ready, instead of the button', async () => {
    renderForm()
    await loaded()
    expect(screen.getByText('Тест ще не готовий приймати відповіді.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /надіслати/i })).not.toBeInTheDocument()
    for (const checkbox of screen.getAllByRole('checkbox')) {
      expect(checkbox).toBeDisabled()
    }
  })
})

describe('PortalTestForm — відмови дверей тесту', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    mockedStructure.mockResolvedValue(TEST)
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedMe.mockResolvedValue(me())
  })

  // The bodies are the doors' own (``homework/test_doors.py``): FastAPI nests
  // ``{code, details}`` under ``detail``, and ``details`` is an English
  // sentence for a developer — which the student must never see (DD-SP-D).
  // Five codes: the sixth, TEST_ANSWERS_REQUIRED, is the file door's and never
  // comes from this route — the file form meets it (the panel's tests).
  it.each([
    [409, 'TEST_FORM_UNAVAILABLE', 'Tests are not taken as answers yet: send the work as a file.'],
    [422, 'NOT_A_TEST_TASK', 'This task is not a test.'],
    [
      409,
      'TEST_VERSION_CHANGED',
      'The test has changed since these answers were given: read it again and send the answers to its current version.',
    ],
    [
      409,
      'TEST_NOT_READY',
      'The test is not ready to be checked yet: its answer key has not been set for this version.',
    ],
    [
      422,
      'ANSWERS_DO_NOT_MATCH_TEST',
      "The answers name what the test does not have: questions ['7'], options [].",
    ],
  ])('%i %s → its own words, never the details the server sent', async (status, code, details) => {
    mockedSubmitTest.mockRejectedValue(new PortalApiError(status, 'x', { detail: { code, details } }))
    renderForm()
    await loaded()
    answerAll()
    fireEvent.click(sendBtn())
    const phrase = submissionCodePhrase(code)
    await waitFor(() => expect(screen.getByText(phrase)).toBeInTheDocument())
    // Its own sentence, not the generic an unknown code falls to.
    expect(phrase).not.toBe(submissionCodePhrase('SOME_NEW_CODE'))
    expect(screen.queryByText(details)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain(details.slice(0, 20))
  })

  it('after a refusal the button stays for another try', async () => {
    mockedSubmitTest.mockRejectedValue(
      new PortalApiError(409, 'x', {
        detail: {
          code: 'TEST_NOT_READY',
          details:
            'The test is not ready to be checked yet: its answer key has not been set for this version.',
        },
      }),
    )
    renderForm()
    await loaded()
    answerAll()
    fireEvent.click(sendBtn())
    await waitFor(() => expect(screen.getByText(submissionCodePhrase('TEST_NOT_READY'))).toBeInTheDocument())
    expect(sendBtn()).toBeEnabled()
  })
})

describe('PortalTestForm — тест змінився, поки студент відповідав', () => {
  const NEW_VERSION = 'b7c19e04' + '3d'.repeat(28)
  const CHANGED: TestStructureResponse = {
    version: NEW_VERSION,
    accepting_answers: true,
    questions: [
      {
        number: '1',
        text: 'Що виведе print(3 ** 2)?',
        options: [
          { label: 'а', text: '6' },
          { label: 'б', text: '9' },
        ],
      },
    ],
  }
  const changed = () =>
    new PortalApiError(409, 'x', {
      detail: {
        code: 'TEST_VERSION_CHANGED',
        details:
          'The test has changed since these answers were given: read it again and send the answers to its current version.',
      },
    })

  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedMe.mockResolvedValue(me())
  })

  it('reads the test again and answers the new version', async () => {
    mockedStructure.mockResolvedValueOnce(TEST).mockResolvedValue(CHANGED)
    mockedSubmitTest.mockRejectedValueOnce(changed()).mockResolvedValue({
      submission_id: 'sub-2',
      status: 'received',
      duplicate: false,
    })
    renderForm()
    await loaded()
    answerAll()
    fireEvent.click(sendBtn())
    // The new version replaces the old one, and nothing ticked carries over.
    await screen.findByText('1. Що виведе print(3 ** 2)?')
    expect(mockedStructure).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('2. Які з типів незмінні? Правильних кілька.')).not.toBeInTheDocument()
    expect(screen.getByText(submissionCodePhrase('TEST_VERSION_CHANGED'))).toBeInTheDocument()
    expect(box('б) 9')).not.toBeChecked()

    fireEvent.click(box('б) 9'))
    fireEvent.click(sendBtn())
    await waitFor(() => expect(mockedSubmitTest).toHaveBeenCalledTimes(2))
    expect(mockedSubmitTest.mock.calls[0]![1].test_version).toBe(VERSION)
    expect(mockedSubmitTest.mock.calls[1]![1]).toEqual({
      answers: { '1': ['б'] },
      test_version: NEW_VERSION,
      response_language: 'ukr',
    })
  })

  it('another refusal does not read the test again', async () => {
    mockedStructure.mockResolvedValue(TEST)
    mockedSubmitTest.mockRejectedValue(
      new PortalApiError(409, 'x', {
        detail: {
          code: 'TEST_NOT_READY',
          details:
            'The test is not ready to be checked yet: its answer key has not been set for this version.',
        },
      }),
    )
    renderForm()
    await loaded()
    answerAll()
    fireEvent.click(sendBtn())
    await waitFor(() => expect(screen.getByText(submissionCodePhrase('TEST_NOT_READY'))).toBeInTheDocument())
    expect(mockedStructure).toHaveBeenCalledTimes(1)
  })
})
