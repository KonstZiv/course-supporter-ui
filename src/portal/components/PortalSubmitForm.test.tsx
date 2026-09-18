import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalSubmitForm } from './PortalSubmitForm'
import { submitErrorMessage } from '../submissionCodes'
import { portalApi, PortalApiError } from '../api/portalClient'
import { resetPortalLanguages } from '../languages'
import { resetSubmissionPolicy } from '../submissionPolicy'
import type { PortalMe, PortalTaskBase, SubmissionPolicyResponse } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: {
      ...actual.portalApi,
      submitTask: vi.fn(),
      // Step Г2 §2.1: the form now reads the language list and the student's
      // standing preference on mount. Both are mocked so the field's two
      // sources are controlled, and so the suite makes no real calls.
      languages: vi.fn(),
      me: vi.fn(),
      // Step Д: the door's own numbers, no longer copied into the form.
      submissionPolicy: vi.fn(),
    },
  }
})

const mockedSubmit = vi.mocked(portalApi.submitTask)
const mockedLanguages = vi.mocked(portalApi.languages)
const mockedMe = vi.mocked(portalApi.me)
const mockedPolicy = vi.mocked(portalApi.submissionPolicy)

// The 41 the server derives (_PROSE | CODE_EXTENSIONS | _ARCHIVES | _DOCUMENTS),
// dot-prefixed and sorted the way the route serves them. Written once, here,
// as a FIXTURE of the wire — not as the form's own knowledge of the door.
const ACCEPT = [
  '.c', '.cc', '.cjs', '.cpp', '.cs', '.css', '.dart', '.docx', '.go', '.gz',
  '.h', '.hpp', '.htm', '.html', '.ipynb', '.java', '.js', '.json', '.jsx',
  '.kt', '.kts', '.md', '.mjs', '.pdf', '.php', '.py', '.rb', '.rs', '.scss',
  '.sh', '.sql', '.swift', '.tgz', '.toml', '.ts', '.tsx', '.txt', '.xml',
  '.yaml', '.yml', '.zip',
]

const TASK_CAP = 10 * 1024 * 1024
const PROJECT_CAP = 100 * 1024 * 1024

const POLICY: SubmissionPolicyResponse = {
  policies: {
    test: { max_bytes: TASK_CAP, accept: ACCEPT, archive_only: false },
    short_task: { max_bytes: TASK_CAP, accept: ACCEPT, archive_only: false },
    task: { max_bytes: TASK_CAP, accept: ACCEPT, archive_only: false },
    project: { max_bytes: PROJECT_CAP, accept: ACCEPT, archive_only: true },
  },
}

// What the server actually serves: a native name for every language on its
// list, read from CLDR (mentor-rebuild task 04). The old fixture had them all
// null, which the backend can no longer produce — so every assertion below was
// exercising the fallback and nothing was exercising the field itself.
// ``cnr`` keeps a null to hold the fallback path, which the nullable contract
// still allows.
const LANGUAGES = [
  { code: 'ukr', name_en: 'Ukrainian', name_native: 'українська' },
  { code: 'eng', name_en: 'English', name_native: 'English' },
  { code: 'cnr', name_en: 'Montenegrin', name_native: null },
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

function renderForm(
  base: PortalTaskBase | null = null,
  taskType: string | null = 'task',
  listedIds: string[] = [],
  courseLanguage: string | null = 'ukr',
) {
  const onSubmitted = vi.fn()
  const view = render(
    <PortalSubmitForm
      taskId="task-1"
      taskType={taskType}
      courseLanguage={courseLanguage}
      base={base}
      listedIds={listedIds}
      onSubmitted={onSubmitted}
    />,
  )
  const relist = (ids: string[]) =>
    view.rerender(
      <PortalSubmitForm
        taskId="task-1"
        taskType={taskType}
        courseLanguage={courseLanguage}
        base={base}
        listedIds={ids}
        onSubmitted={onSubmitted}
      />,
    )
  return { onSubmitted, relist }
}

const languageField = () => screen.getByLabelText('Мова рецензії')

function pickFile(name = 'a.py', size?: number) {
  const file = new File(['print()'], name, { type: 'text/plain' })
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size })
  fireEvent.change(screen.getByLabelText('Файл рішення'), {
    target: { files: [file] },
  })
}

const submitBtn = () => screen.getByRole('button', { name: /надіслати/i })

describe('PortalSubmitForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    resetSubmissionPolicy()
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedPolicy.mockResolvedValue(POLICY)
    mockedMe.mockResolvedValue(me())
  })

  it('submits a new attempt and re-fetches on success', async () => {
    mockedSubmit.mockResolvedValue({ submission_id: 's', status: 'received', duplicate: false })
    const { onSubmitted } = renderForm()
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText('Рішення надіслано — очікує перевірки.')).toBeInTheDocument()
    })
    expect(onSubmitted).toHaveBeenCalledTimes(1)
  })

  it('shows a neutral "already submitted" on duplicate and does NOT re-fetch', async () => {
    mockedSubmit.mockResolvedValue({ submission_id: 's', status: 'completed', duplicate: true })
    const { onSubmitted } = renderForm()
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(
        screen.getByText('Цей файл уже подано раніше — нову спробу не створено.'),
      ).toBeInTheDocument()
    })
    expect(onSubmitted).not.toHaveBeenCalled()
  })

  it('renders a code-less 422 inline as the generic', async () => {
    // Every door refusal now carries a code, so a 422 without one is a
    // validation failure the student did not cause — a format lecture would
    // point them at the wrong thing.
    mockedSubmit.mockRejectedValue(new PortalApiError(422, 'bad ext'))
    renderForm()
    pickFile('a.exe')
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText(/сталася помилка/)).toBeInTheDocument()
    })
  })

  it('renders a 409 readiness message and keeps the button usable', async () => {
    mockedSubmit.mockRejectedValue(new PortalApiError(409, 'not ready'))
    renderForm()
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(
        screen.getByText('Завдання ще не готове до подачі. Спробуйте трохи згодом.'),
      ).toBeInTheDocument()
    })
    expect(submitBtn()).toBeEnabled()
  })

  it('rejects an oversize file in the client preflight without a POST', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'українська' }) // policy settled
    pickFile('big.py', TASK_CAP + 1)
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText('Файл завеликий — максимум 10 МБ.')).toBeInTheDocument()
    })
    expect(mockedSubmit).not.toHaveBeenCalled()
  })

  it('lets a project archive through at a size a task would refuse', async () => {
    // The whole of DD-SP-V in one assertion: 11 MiB was refused by the old
    // literal before the request was made, while the server allows 100 MB for
    // a project. The cap is now the one the door actually applies.
    mockedSubmit.mockResolvedValue({
      submission_id: 's',
      status: 'received',
      duplicate: false,
    })
    renderForm(null, 'project')
    await screen.findByRole('option', { name: 'українська' })
    pickFile('solution.zip', TASK_CAP + 1)
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1))
  })

  it('names the project cap when a project archive is over it', async () => {
    renderForm(null, 'project')
    await screen.findByRole('option', { name: 'українська' })
    pickFile('huge.zip', PROJECT_CAP + 1)
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(
        screen.getByText('Файл завеликий — максимум 100 МБ.'),
      ).toBeInTheDocument()
    })
    expect(mockedSubmit).not.toHaveBeenCalled()
  })

  it('sends the file when the policy did not load, rather than guessing', async () => {
    // Fail-soft, symmetric with the language list: an unavailable policy must
    // not invent a cap. The server is the door either way, and a guess would
    // refuse a legitimate project archive with no way for the student to tell
    // why.
    mockedPolicy.mockRejectedValue(new Error('offline'))
    mockedSubmit.mockResolvedValue({
      submission_id: 's',
      status: 'received',
      duplicate: false,
    })
    renderForm(null, 'project')
    await screen.findByRole('option', { name: 'українська' })
    pickFile('solution.zip', PROJECT_CAP + 1)
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(1))
  })

  it('locks during submission — a double click sends one POST', async () => {
    let resolve: (v: { submission_id: string; status: string; duplicate: boolean }) => void = () => {}
    mockedSubmit.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    renderForm()
    pickFile()
    // Same DOM node across renders; after the first click it is disabled +
    // shows a spinner (no "Надіслати" text), so a second click is a no-op.
    const btn = submitBtn()
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(mockedSubmit).toHaveBeenCalledTimes(1)
    resolve({ submission_id: 's', status: 'received', duplicate: false })
  })
})

describe('PortalSubmitForm — KD18 P5 auto-echo + D5 gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const ready: PortalTaskBase = { version: 1, snapshot_hash: 'h-abc', state: 'ready' }

  it('auto-echoes base_snapshot_hash from a READY base descriptor', async () => {
    mockedSubmit.mockResolvedValue({ submission_id: 's', status: 'received', duplicate: false })
    renderForm(ready)
    pickFile('proj.zip')
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled())
    const [, fd] = mockedSubmit.mock.calls[0] as [string, FormData]
    expect(fd.get('base_snapshot_hash')).toBe('h-abc')
  })

  it('sends NO base_snapshot_hash when base is null (base-less / non-project)', async () => {
    mockedSubmit.mockResolvedValue({ submission_id: 's', status: 'received', duplicate: false })
    renderForm(null)
    pickFile('proj.zip')
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled())
    const [, fd] = mockedSubmit.mock.calls[0] as [string, FormData]
    expect(fd.get('base_snapshot_hash')).toBeNull()
  })

  it('D5: base ready → submit enabled once a file is picked', () => {
    renderForm(ready)
    pickFile('proj.zip')
    expect(submitBtn()).toBeEnabled()
  })

  it('D5: base=null → submit ALLOWED (distinct from a non-ready base)', () => {
    renderForm(null)
    pickFile('proj.zip')
    expect(submitBtn()).toBeEnabled()
  })

  it('D5: base pending → submit disabled + hint (NOT collapsed with null)', () => {
    renderForm({ version: 1, snapshot_hash: null, state: 'pending' })
    pickFile('proj.zip')
    expect(submitBtn()).toBeDisabled()
    expect(screen.getByText(/коли автор підготує/i)).toBeInTheDocument()
  })

  it('D5: base failed → submit disabled', () => {
    renderForm({ version: 2, snapshot_hash: null, state: 'failed' })
    pickFile('proj.zip')
    expect(submitBtn()).toBeDisabled()
  })
})

describe('PortalSubmitForm — submit error-code dictionary (KD18 P5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const submitWith = (err: unknown) => {
    mockedSubmit.mockRejectedValue(err)
    renderForm()
    pickFile('proj.zip')
    fireEvent.click(submitBtn())
  }

  // The body mirrors the REAL FastAPI shape: HTTPException(detail={code,details})
  // crosses the wire as {detail: {code, details}} — a nested object, NOT a
  // top-level {code}. (The earlier fixtures used the wrong shape and masked a
  // read-path bug that live acceptance caught.)
  it('422 ARCHIVE_ONLY → the code-keyed uk phrase', async () => {
    submitWith(
      new PortalApiError(422, 'x', { detail: { code: 'ARCHIVE_ONLY', details: '...' } }),
    )
    await waitFor(() => expect(screen.getByText(/архів проєкту/)).toBeInTheDocument())
  })

  it('409 BASE_NOT_READY → the code-keyed uk phrase (D5 race backstop)', async () => {
    submitWith(
      new PortalApiError(409, 'x', { detail: { code: 'BASE_NOT_READY', details: '...' } }),
    )
    await waitFor(() => expect(screen.getByText(/ще готується/)).toBeInTheDocument())
  })

  it('422 MISSING_BASE_ECHO → the code-keyed uk phrase', async () => {
    submitWith(
      new PortalApiError(422, 'x', {
        detail: { code: 'MISSING_BASE_ECHO', details: '...' },
      }),
    )
    await waitFor(() => expect(screen.getByText(/визначити версію/)).toBeInTheDocument())
  })

  it('422 UNKNOWN_BASE_ECHO → the code-keyed uk phrase', async () => {
    submitWith(
      new PortalApiError(422, 'x', {
        detail: { code: 'UNKNOWN_BASE_ECHO', details: '...' },
      }),
    )
    await waitFor(() => expect(screen.getByText(/оновився/)).toBeInTheDocument())
  })

  it('unknown code → the ratified generic, and NOT the backend string', async () => {
    // Inverted deliberately (DD-SP-D). ``details`` is an English developer
    // sentence — "File extension '.exe' is not accepted…" — and the old
    // behaviour put it in front of the student. The phrase dictionary is total,
    // so there is nothing left for the raw string to fall back to.
    submitWith(
      new PortalApiError(422, 'x', {
        detail: { code: 'NEW_CODE', details: "File extension '.exe' is not accepted." },
      }),
    )
    await waitFor(() =>
      expect(
        screen.getByText('Під час обробки подачі сталася помилка. Спробуйте подати ще раз.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByText(/File extension/)).not.toBeInTheDocument()
  })

  it('plain string detail → the status phrase, never the string (DD-SP-D)', async () => {
    // The second door the raw server text used to come through. For these
    // statuses ``detail`` is an English developer sentence.
    submitWith(
      new PortalApiError(409, 'x', {
        detail: 'Task is not ready for submissions yet (its summary has not been generated).',
      }),
    )
    await waitFor(() =>
      expect(screen.getByText(/ще не готове до подачі/)).toBeInTheDocument(),
    )
    expect(screen.queryByText(/summary has not been generated/)).not.toBeInTheDocument()
  })

  it('detail-less 422 → the generic (no code means no format verdict)', async () => {
    submitWith(new PortalApiError(422, 'x', null))
    await waitFor(() => expect(screen.getByText(/сталася помилка/)).toBeInTheDocument())
  })

  it('detail-less 409 → the curated readiness fallback', async () => {
    submitWith(new PortalApiError(409, 'x', null))
    await waitFor(() =>
      expect(
        screen.getByText('Завдання ще не готове до подачі. Спробуйте трохи згодом.'),
      ).toBeInTheDocument(),
    )
  })
})

describe('submitErrorMessage — no server string ever reaches the student', () => {
  // The property, over every slot a backend string can occupy and every status
  // that reaches this function. Checked directly rather than through a render
  // so the whole surface is covered, not a sample of it.
  const SERVER = 'File extension .exe is not accepted, said the server'

  const bodies: unknown[] = [
    { detail: SERVER },
    { detail: { code: 'NEW_CODE', details: SERVER } },
    { detail: { details: SERVER } },
    { detail: [{ loc: ['body', 'file'], msg: SERVER, type: 'value_error' }] },
    { detail: { code: 'forbidden_type', details: SERVER } },
    { detail: { code: 'ARCHIVE_ONLY', details: SERVER } },
    { message: SERVER },
    SERVER,
    null,
  ]

  it.each([400, 401, 403, 404, 409, 413, 422, 500, 503])(
    'status %i — no body shape leaks the string',
    (status) => {
      for (const body of bodies) {
        const phrase = submitErrorMessage(new PortalApiError(status, SERVER, body))
        expect(phrase).not.toContain(SERVER)
        expect(phrase).not.toContain('File extension')
        expect(phrase.length).toBeGreaterThan(0)
      }
    },
  )

  it('a non-API failure keeps its own specific phrase', () => {
    expect(submitErrorMessage(new TypeError('Failed to fetch'))).toMatch(
      /Перевірте зʼєднання/,
    )
    expect(submitErrorMessage(new TypeError('Failed to fetch'))).not.toContain(
      'Failed to fetch',
    )
  })

  it('the three curated statuses answer with their own sentence', () => {
    const say = (s: number) => submitErrorMessage(new PortalApiError(s, 'x', null))
    expect(say(401)).toMatch(/Сесія закінчилась/)
    expect(say(404)).toMatch(/Завдання не знайдено/)
    expect(say(409)).toMatch(/ще не готове до подачі/)
    expect(say(500)).toMatch(/сталася помилка/)
  })
})

describe('PortalSubmitForm — the file picker offers what the server serves', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSubmissionPolicy()
    mockedPolicy.mockResolvedValue(POLICY)
  })

  const acceptAfterLoad = async (taskType: string | null = 'task') => {
    renderForm(null, taskType)
    const picker = screen.getByLabelText('Файл рішення') as HTMLInputElement
    await waitFor(() => expect(picker.accept).not.toBe(''))
    return picker.accept.split(',').map((e) => e.trim())
  }

  it('offers exactly what the policy served, nothing added or dropped', async () => {
    // The list is no longer knowledge this file holds — it is an echo. The
    // assertion is equality with the fixture of the wire, which is the only
    // thing that can go wrong now: a transform that reshapes what arrived.
    expect(await acceptAfterLoad()).toEqual(ACCEPT)
  })

  it('offers the same list for a project — narrowing is the server\'s gate', async () => {
    // archive_only is served as its own field and enforced server-side with
    // ARCHIVE_ONLY. The portal keeps no archive list of its own to intersect
    // with (the one it had went with the constants), so re-deriving one here
    // would be the copy this endpoint exists to delete.
    expect(await acceptAfterLoad('project')).toEqual(ACCEPT)
  })

  it('offers nothing until the policy arrives, rather than a stale guess', () => {
    renderForm()
    const picker = screen.getByLabelText('Файл рішення') as HTMLInputElement
    expect(picker.accept).toBe('')
  })
})

describe('PortalSubmitForm — мова рецензії (крок Г2 §2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    resetSubmissionPolicy()
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedPolicy.mockResolvedValue(POLICY)
    mockedMe.mockResolvedValue(me())
    mockedSubmit.mockResolvedValue({
      submission_id: 's',
      status: 'received',
      duplicate: false,
    })
  })

  it('offers the server list with "course language" first, named', async () => {
    renderForm()
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'українська' })).toBeInTheDocument()
    })
    const options = screen.getAllByRole('option')
    // The absence of a choice leads and still carries no code — but it now
    // says WHICH language it means, from the same list the named options use.
    expect(options[0]).toHaveValue('')
    expect(options.map((o) => o.textContent)).toEqual([
      'Мовою курсу (українська)',
      'українська',
      'English',
      // The one entry whose native name is null falls back to the English
      // name — the behaviour the nullable contract leaves room for.
      'Montenegrin',
    ])
  })

  it('names the course language from the list, not from a dictionary of its own', async () => {
    // A course in English must say English. The name comes from the same
    // `name_native || name_en` the named options use, so the two cannot
    // disagree about what a code is called.
    renderForm(null, 'task', [], 'eng')
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Мовою курсу (English)' }),
      ).toBeInTheDocument()
    })
  })

  it('stays bare while the list is loading, rather than naming the wrong one', async () => {
    // The label is built from the list; before it arrives there is nothing to
    // build from, and an option naming the wrong language would be worse than
    // one naming none.
    mockedLanguages.mockRejectedValue(new Error('offline'))
    renderForm()
    await waitFor(() => expect(mockedMe).toHaveBeenCalled())
    expect(
      screen.getByRole('option', { name: 'Мовою курсу' }),
    ).toBeInTheDocument()
  })

  it('opens on the stored preference', async () => {
    mockedMe.mockResolvedValue(me({ preferred_language: 'eng' }))
    renderForm()
    await waitFor(() => expect(languageField()).toHaveValue('eng'))
  })

  it('opens on "course language" when the student has no preference', async () => {
    renderForm()
    await waitFor(() => expect(mockedMe).toHaveBeenCalled())
    expect(languageField()).toHaveValue('')
  })

  it('sends response_language only when a language is chosen', async () => {
    renderForm()
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()
    })
    fireEvent.change(languageField(), { target: { value: 'eng' } })
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled())
    const body = mockedSubmit.mock.calls[0]![1] as FormData
    expect(body.get('response_language')).toBe('eng')
  })

  it('sends the COURSE code on "course language" (крок Д)', async () => {
    // Reverses the Г2 behaviour this test used to pin. Sending nothing made
    // the server fall back to the student's STORED preference first, so the
    // option promising the course's language delivered the language of the
    // last review instead. Naming the code is the only way the label and the
    // outcome agree.
    renderForm()
    await waitFor(() => expect(mockedMe).toHaveBeenCalled())
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled())
    const body = mockedSubmit.mock.calls[0]![1] as FormData
    expect(body.get('response_language')).toBe('ukr')
  })

  it('sends the course code even when the preference says otherwise', async () => {
    // The case that was measured on prod: preference eng, course ukr, review
    // in English under a Ukrainian label. The field still OPENS on the
    // preference (unchanged); choosing "course language" now overrides it.
    mockedMe.mockResolvedValue(me({ preferred_language: 'eng' }))
    renderForm()
    await waitFor(() =>
      expect((languageField() as HTMLSelectElement).value).toBe('eng'),
    )
    fireEvent.change(languageField(), { target: { value: '' } })
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled())
    const body = mockedSubmit.mock.calls[0]![1] as FormData
    expect(body.get('response_language')).toBe('ukr')
  })

  it('hides the option when the root carries no language', async () => {
    // A CHECK forbids this on a root, so it is a malformed row rather than a
    // state to design for — and an option that cannot say which language it
    // means is worse than no option. The named languages still work.
    renderForm(null, 'task', [], null)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'українська' })).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('option', { name: 'Мовою курсу' }),
    ).not.toBeInTheDocument()
  })

  it('stays usable when the language list cannot be fetched', async () => {
    mockedLanguages.mockRejectedValue(new Error('offline'))
    renderForm()
    await waitFor(() => expect(mockedMe).toHaveBeenCalled())
    // Only the fallback option — and submitting still works, which is the
    // behaviour that existed before this field did.
    expect(screen.getAllByRole('option')).toHaveLength(1)
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalled())
  })

  it('stays usable when the preference cannot be read', async () => {
    mockedMe.mockRejectedValue(new Error('offline'))
    renderForm()
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()
    })
    expect(languageField()).toHaveValue('')
  })
})


describe('PortalSubmitForm — після подачі (крок Д)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPortalLanguages()
    resetSubmissionPolicy()
    mockedLanguages.mockResolvedValue({ items: LANGUAGES, total: LANGUAGES.length })
    mockedMe.mockResolvedValue(me())
    mockedPolicy.mockResolvedValue(POLICY)
    mockedSubmit.mockResolvedValue({
      submission_id: 'sub-1',
      status: 'received',
      duplicate: false,
    })
  })

  const filePicker = () => screen.getByLabelText('Файл рішення') as HTMLInputElement

  it('clears the file and the note, and disables the button again', async () => {
    renderForm()
    await screen.findByRole('option', { name: 'українська' })
    fireEvent.change(screen.getByLabelText('Коментар'), {
      target: { value: 'питання до рецензента' },
    })
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText('Рішення надіслано — очікує перевірки.')).toBeInTheDocument()
    })
    // The work is sent; nothing about it is still sitting in the form.
    expect(filePicker().files?.length ?? 0).toBe(0)
    expect((screen.getByLabelText('Коментар') as HTMLTextAreaElement).value).toBe('')
    expect(submitBtn()).toBeDisabled()
  })

  it('retires the notice once the attempts list shows the submission', async () => {
    const { relist } = renderForm()
    await screen.findByRole('option', { name: 'українська' })
    pickFile()
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText('Рішення надіслано — очікує перевірки.')).toBeInTheDocument()
    })
    // The list below adopts the attempt and states its real status; the frozen
    // "очікує перевірки" would now be the second, staler answer.
    relist(['sub-1'])
    await waitFor(() => {
      expect(
        screen.queryByText('Рішення надіслано — очікує перевірки.'),
      ).not.toBeInTheDocument()
    })
  })

  it('keeps the notice while the list shows only OTHER attempts', async () => {
    const { relist } = renderForm()
    await screen.findByRole('option', { name: 'українська' })
    pickFile()
    fireEvent.click(submitBtn())
    await screen.findByText('Рішення надіслано — очікує перевірки.')
    relist(['some-older-attempt'])
    expect(
      screen.getByText('Рішення надіслано — очікує перевірки.'),
    ).toBeInTheDocument()
  })

  it('after a duplicate the button stays disabled until the file changes', async () => {
    mockedSubmit.mockResolvedValue({
      submission_id: 'sub-old',
      status: 'completed',
      duplicate: true,
    })
    renderForm()
    await screen.findByRole('option', { name: 'українська' })
    pickFile('a.py')
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(
        screen.getByText('Цей файл уже подано раніше — нову спробу не створено.'),
      ).toBeInTheDocument()
    })
    // Re-sending the same bytes can only produce the same answer.
    expect(submitBtn()).toBeDisabled()
    pickFile('b.py')
    expect(submitBtn()).toBeEnabled()
  })
})
