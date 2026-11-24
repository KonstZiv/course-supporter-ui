import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useServiceStatus } from '../../serviceStatus/store'

// Mock the strip hook with a mount counter. Its real polling behaviour is
// covered in useActivityStrip.test; here we prove only that the shell — and thus
// anything mounted in it, including the strip's session-long loop — survives a
// child-route change without remounting (В3; mandatory machine proof, §7.2).
const { mountSpy } = vi.hoisted(() => ({ mountSpy: vi.fn() }))
vi.mock('../../hooks/useActivityStrip', async () => {
  const { useEffect } = await import('react')
  return {
    useActivityStrip: () => {
      useEffect(() => {
        mountSpy()
      }, [])
      return { items: [] }
    },
  }
})

import { AppLayout } from './AppLayout'

describe('AppLayout shell persistence (В3)', () => {
  beforeEach(() => {
    useServiceStatus.setState({
      status: 'ok',
      since: null,
      retryAfter: 15,
      hasSucceeded: false,
      recoveryCount: 0,
      unsaved: false,
    })
  })

  it('mounts the activity-strip hook once across child-route navigation', () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route
              path="a"
              element={
                <div>
                  Screen A<Link to="/b">to B</Link>
                </div>
              }
            />
            <Route
              path="b"
              element={
                <div>
                  Screen B<Link to="/a">to A</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Screen A')).toBeInTheDocument()
    expect(mountSpy).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('to B'))
    expect(screen.getByText('Screen B')).toBeInTheDocument()
    fireEvent.click(screen.getByText('to A'))
    expect(screen.getByText('Screen A')).toBeInTheDocument()

    // The shell never remounted → the strip hook mounted exactly once.
    expect(mountSpy).toHaveBeenCalledTimes(1)
  })

  it('remounts Outlet on recovery when saved, and preserves Outlet when unsaved', () => {
    const childMountSpy = vi.fn()
    function ProbePage() {
      useEffect(() => {
        childMountSpy()
      }, [])
      return <div>Probe Page</div>
    }

    useServiceStatus.setState({ hasSucceeded: true })

    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="a" element={<ProbePage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(childMountSpy).toHaveBeenCalledTimes(1)

    // Saved page: recovery remounts Outlet to re-fetch data.
    act(() => {
      useServiceStatus.getState().report('updating', 10)
    })
    expect(screen.getByTestId('service-status-banner')).toBeInTheDocument()
    act(() => {
      useServiceStatus.getState().recover()
    })
    expect(screen.queryByTestId('service-status-banner')).not.toBeInTheDocument()
    expect(childMountSpy).toHaveBeenCalledTimes(2)

    // Unsaved page: recovery hides the banner without remounting Outlet.
    act(() => {
      useServiceStatus.getState().setUnsaved(true)
      useServiceStatus.getState().report('unreachable')
    })
    expect(screen.getByTestId('service-status-banner')).toBeInTheDocument()
    act(() => {
      useServiceStatus.getState().recover()
    })
    expect(screen.queryByTestId('service-status-banner')).not.toBeInTheDocument()
    expect(childMountSpy).toHaveBeenCalledTimes(2)
  })

  it('replaces Outlet with full-page status when nothing has succeeded yet', () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="a" element={<div>Initial Empty State</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Initial Empty State')).toBeInTheDocument()

    act(() => {
      useServiceStatus.getState().report('updating', 15)
    })

    expect(screen.queryByText('Initial Empty State')).not.toBeInTheDocument()
    expect(screen.getByText('Сервіс оновлюється')).toBeInTheDocument()
  })
})
