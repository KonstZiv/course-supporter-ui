import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalSubmitForm } from './PortalSubmitForm'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalTaskBase } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submitTask: vi.fn() },
  }
})

const mockedSubmit = vi.mocked(portalApi.submitTask)

function renderForm(base: PortalTaskBase | null = null) {
  const onSubmitted = vi.fn()
  render(<PortalSubmitForm taskId="task-1" base={base} onSubmitted={onSubmitted} />)
  return { onSubmitted }
}

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

  it('renders a 422 inline (server authoritative)', async () => {
    mockedSubmit.mockRejectedValue(new PortalApiError(422, 'bad ext'))
    renderForm()
    pickFile('a.exe')
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText(/Файл не прийнято/)).toBeInTheDocument()
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
    pickFile('big.py', 11 * 1024 * 1024)
    fireEvent.click(submitBtn())
    await waitFor(() => {
      expect(screen.getByText('Файл завеликий — максимум 10 МБ.')).toBeInTheDocument()
    })
    expect(mockedSubmit).not.toHaveBeenCalled()
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

  it('plain string detail (other 4xx) → shown as-is', async () => {
    submitWith(new PortalApiError(422, 'x', { detail: 'Розширення не дозволене' }))
    await waitFor(() =>
      expect(screen.getByText('Розширення не дозволене')).toBeInTheDocument(),
    )
  })

  it('detail-less 422 → the curated file-type fallback', async () => {
    submitWith(new PortalApiError(422, 'x', null))
    await waitFor(() => expect(screen.getByText(/Файл не прийнято/)).toBeInTheDocument())
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
