import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { RouteErrorPage } from './RouteErrorPage'

describe('RouteErrorPage', () => {
  it('renders footer with support link', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    function Crash(): React.ReactElement {
      throw new Error('Test error')
    }

    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <Crash />,
          errorElement: <RouteErrorPage />,
        },
      ],
      { initialEntries: ['/'] },
    )

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: /Щось пішло не так/ })).toBeInTheDocument()
    const supportLink = screen.getByRole('link', { name: 'support@pythoncourse.me' })
    expect(supportLink).toBeInTheDocument()
    expect(supportLink).toHaveAttribute('href', 'mailto:support@pythoncourse.me')
  })
})
