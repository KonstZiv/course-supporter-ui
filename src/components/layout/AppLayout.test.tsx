import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'

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
})
