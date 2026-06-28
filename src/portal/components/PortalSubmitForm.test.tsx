import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PortalSubmitForm } from './PortalSubmitForm'
import { portalApi, PortalApiError } from '../api/portalClient'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, submitTask: vi.fn() },
  }
})

const mockedSubmit = vi.mocked(portalApi.submitTask)

function renderForm() {
  const onSubmitted = vi.fn()
  render(<PortalSubmitForm taskId="task-1" onSubmitted={onSubmitted} />)
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
