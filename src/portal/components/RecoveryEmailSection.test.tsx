import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RecoveryEmailSection } from './RecoveryEmailSection'
import { portalApi, PortalApiError } from '../api/portalClient'
import type { PortalMe } from '../types'

vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return {
    ...actual,
    portalApi: { ...actual.portalApi, me: vi.fn(), setRecoveryEmail: vi.fn() },
  }
})

const mockedMe = vi.mocked(portalApi.me)
const mockedSet = vi.mocked(portalApi.setRecoveryEmail)

function meWith(over: Partial<PortalMe>): PortalMe {
  return {
    student_id: 's1',
    tenant_id: 't1',
    login: 'olena',
    display_name: 'Олена',
    recovery_email: null,
    recovery_email_confirmed: false,
    ...over,
  }
}

describe('RecoveryEmailSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the none state with an add button', async () => {
    mockedMe.mockResolvedValue(meWith({ recovery_email: null }))
    render(<RecoveryEmailSection />)
    await waitFor(() => {
      expect(screen.getByText('Резервну пошту не налаштовано.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Додати пошту' })).toBeInTheDocument()
  })

  it('renders the pending state with change + resend', async () => {
    mockedMe.mockResolvedValue(
      meWith({ recovery_email: 'a@b.com', recovery_email_confirmed: false }),
    )
    render(<RecoveryEmailSection />)
    await waitFor(() => {
      expect(screen.getByText('a@b.com')).toBeInTheDocument()
    })
    expect(screen.getByText(/очікує підтвердження/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Змінити' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Надіслати лист повторно' }),
    ).toBeInTheDocument()
  })

  it('renders the confirmed state without a resend button', async () => {
    mockedMe.mockResolvedValue(
      meWith({ recovery_email: 'a@b.com', recovery_email_confirmed: true }),
    )
    render(<RecoveryEmailSection />)
    await waitFor(() => {
      expect(screen.getByText('Підтверджено.')).toBeInTheDocument()
    })
    expect(
      screen.queryByRole('button', { name: 'Надіслати лист повторно' }),
    ).not.toBeInTheDocument()
  })

  it('adds an email → POSTs and shows the pending state', async () => {
    mockedMe.mockResolvedValue(meWith({ recovery_email: null }))
    mockedSet.mockResolvedValue({
      recovery_email: 'new@x.com',
      recovery_email_confirmed: false,
    })
    render(<RecoveryEmailSection />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Додати пошту' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Додати пошту' }))
    fireEvent.change(screen.getByLabelText('Пошта'), {
      target: { value: 'new@x.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }))

    await waitFor(() => expect(screen.getByText('new@x.com')).toBeInTheDocument())
    expect(mockedSet).toHaveBeenCalledWith({ email: 'new@x.com' })
    expect(screen.getByText(/очікує підтвердження/i)).toBeInTheDocument()
  })

  it('rejects a malformed email client-side without POSTing', async () => {
    mockedMe.mockResolvedValue(meWith({ recovery_email: null }))
    render(<RecoveryEmailSection />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Додати пошту' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Додати пошту' }))
    fireEvent.change(screen.getByLabelText('Пошта'), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }))

    expect(screen.getByText('Вкажіть коректну адресу пошти.')).toBeInTheDocument()
    expect(mockedSet).not.toHaveBeenCalled()
  })

  it('resends the confirm link for the current email', async () => {
    mockedMe.mockResolvedValue(
      meWith({ recovery_email: 'a@b.com', recovery_email_confirmed: false }),
    )
    mockedSet.mockResolvedValue({
      recovery_email: 'a@b.com',
      recovery_email_confirmed: false,
    })
    render(<RecoveryEmailSection />)
    await waitFor(() => expect(screen.getByText('a@b.com')).toBeInTheDocument())
    fireEvent.click(
      screen.getByRole('button', { name: 'Надіслати лист повторно' }),
    )
    await waitFor(() =>
      expect(screen.getByText('Лист надіслано повторно.')).toBeInTheDocument(),
    )
    expect(mockedSet).toHaveBeenCalledWith({ email: 'a@b.com' })
  })

  it('shows a soft load error when /me fails (non-401)', async () => {
    mockedMe.mockRejectedValue(new PortalApiError(500, 'boom'))
    render(<RecoveryEmailSection />)
    await waitFor(() => {
      expect(
        screen.getByText('Не вдалося завантажити стан резервної пошти.'),
      ).toBeInTheDocument()
    })
  })
})
