import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnitsReminders } from './UnitsReminders'
import type { PortalBillingOutlook } from '../../types'

describe('UnitsReminders', () => {
  it('shows nextMayFail text instead of low reminder when warning is low and reviews_left is 0', () => {
    const outlook: PortalBillingOutlook = {
      reviews_left: 0,
      warning: 'low',
      expiring_soon: null,
      paid_by: 'self',
      charging_enabled: true,
    }
    render(
      <UnitsReminders
        outlook={outlook}
        buy={<button type="button">Купити юніти</button>}
      />,
    )
    expect(
      screen.getByText('На наступну перевірку юнітів може не вистачити.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/приблизно на 0/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Купити юніти' })).toBeInTheDocument()
  })
})
