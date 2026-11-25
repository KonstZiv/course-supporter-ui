import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ServiceStatusBanner } from './ServiceStatusBanner'
import { useServiceStatus } from '../../serviceStatus/store'
import { SUPPORT_ADDRESS } from '../../utils/supportAddress'

const fetchMock = vi.fn()

describe('ServiceStatusBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-24T20:00:00Z'))
    useServiceStatus.setState({
      status: 'ok',
      since: null,
      retryAfter: 15,
      hasSucceeded: true,
      recoveryCount: 0,
      unsaved: false,
    })
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('counts down and polls /health at zero, disappearing on 200', async () => {
    useServiceStatus.getState().report('updating', 5)
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    render(<ServiceStatusBanner />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Сервіс оновлюється')).toBeInTheDocument()
    expect(screen.getByText(/через 5 с/)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/через 4 с/)).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })

    expect(fetchMock).toHaveBeenCalledWith('/health')
    expect(useServiceStatus.getState().status).toBe('ok')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows longWait with support address after 10 minutes and checks every 60s', async () => {
    useServiceStatus.getState().report('unreachable')
    fetchMock.mockResolvedValue(new Response('down', { status: 503 }))

    render(<ServiceStatusBanner />)
    expect(screen.getByText("Немає зв'язку з сервером")).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000)
    })

    expect(screen.getByText(new RegExp(SUPPORT_ADDRESS))).toBeInTheDocument()
    expect(
      screen.getByText(/Цього разу оновлення триває довше, ніж зазвичай/),
    ).toBeInTheDocument()

    fetchMock.mockClear()
    await act(async () => {
      vi.advanceTimersByTime(59 * 1000)
    })
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    expect(fetchMock).toHaveBeenCalledWith('/health')
  })

  it('triggers /health immediately when Retry now is clicked', async () => {
    useServiceStatus.getState().report('unreachable')
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    render(<ServiceStatusBanner />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Спробувати зараз' }))
    })

    expect(fetchMock).toHaveBeenCalledWith('/health')
    expect(useServiceStatus.getState().status).toBe('ok')
  })
})
