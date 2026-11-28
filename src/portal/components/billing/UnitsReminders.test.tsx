import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnitsReminders } from './UnitsReminders'
import type { PortalBillingOutlook, PortalPublicNumbers } from '../../types'
import { LanguageProvider } from '../../../i18n/LanguageProvider'

const BASE_OUTLOOK: PortalBillingOutlook = {
  reviews_left: 0,
  warning: 'next_may_fail',
  expiring_soon: null,
  paid_by: 'self',
  charging_enabled: true,
}

const READY_NUMBERS: PortalPublicNumbers = {
  contract_version: 1,
  packages: [
    { id: 'units-500-v1', units: 500, price_minor: 999, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
    { id: 'units-1500-v1', units: 1500, price_minor: 1499, currency: 'EUR', validity_months: 6, tax_mode: 'exclusive' },
  ],
  review_cost: {
    homework: {
      status: 'ready',
      actual: { min: 44, typical: 72, max: 163 },
      smallest_package_reviews: { low: 2, typical: 4, high: 7 },
    },
  },
}

describe('UnitsReminders', () => {
  it('shows nextMayFail text instead of low reminder when warning is low and reviews_left is 0', () => {
    const outlook: PortalBillingOutlook = {
      ...BASE_OUTLOOK,
      warning: 'low',
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

  it('shows variant A in uk and en when available is 0 and numbers are ready, hiding nextMayFail', () => {
    const { rerender } = render(
      <LanguageProvider language="uk">
        <UnitsReminders
          outlook={BASE_OUTLOOK}
          available={0}
          publicNumbers={READY_NUMBERS}
          buy={<button type="button">Купити юніти</button>}
        />
      </LanguageProvider>,
    )
    expect(
      screen.getByText(
        'Перевірки робіт платні. Одна перевірка зазвичай коштує 72 юніти (від 44 до 163; перевірка проєкту — дорожче). Найменшого пакета (500 юнітів) вистачає приблизно на 2–7 перевірок.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('На наступну перевірку юнітів може не вистачити.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Купити юніти' })).toBeInTheDocument()

    rerender(
      <LanguageProvider language="en">
        <UnitsReminders
          outlook={BASE_OUTLOOK}
          available={0}
          publicNumbers={READY_NUMBERS}
          buy={<button type="button">Buy units</button>}
        />
      </LanguageProvider>,
    )
    expect(
      screen.getByText(
        'Reviews of your work are paid. One review usually costs 72 units (from 44 to 163; a project review costs more). The smallest package (500 units) covers about 2–7 reviews.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('You may not have enough units for the next review.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Buy units' })).toBeInTheDocument()
  })

  it('shows variant B when available is 0 and status is insufficient_data or publicNumbers is null', () => {
    const insufficient: PortalPublicNumbers = {
      ...READY_NUMBERS,
      review_cost: {
        homework: {
          status: 'insufficient_data',
          actual: null,
          smallest_package_reviews: null,
        },
      },
    }
    const { rerender } = render(
      <UnitsReminders
        outlook={BASE_OUTLOOK}
        available={0}
        publicNumbers={insufficient}
        buy={<button type="button">Купити юніти</button>}
      />,
    )
    expect(screen.getByText('Перевірки робіт оплачуються юнітами.')).toBeInTheDocument()

    rerender(
      <UnitsReminders
        outlook={BASE_OUTLOOK}
        available={0}
        publicNumbers={null}
        buy={<button type="button">Купити юніти</button>}
      />,
    )
    expect(screen.getByText('Перевірки робіт оплачуються юнітами.')).toBeInTheDocument()
  })

  it('does not flash nextMayFail while publicNumbers is undefined when available is 0, and keeps expiry reminder', () => {
    render(
      <UnitsReminders
        outlook={{
          ...BASE_OUTLOOK,
          expiring_soon: { units: 500, expires_on: '2026-12-01' },
        }}
        available={0}
        publicNumbers={undefined}
        buy={<button type="button">Купити юніти</button>}
        units={<a href="/billing">Юніти</a>}
      />,
    )
    expect(screen.queryByText('На наступну перевірку юнітів може не вистачити.')).toBeNull()
    expect(
      screen.getByText('500 юнітів згорить 1 грудня 2026: тоді закінчується строк пакета.'),
    ).toBeInTheDocument()
  })

  it('keeps nextMayFail when available is greater than 0', () => {
    render(
      <UnitsReminders
        outlook={BASE_OUTLOOK}
        available={5}
        publicNumbers={READY_NUMBERS}
        buy={<button type="button">Купити юніти</button>}
      />,
    )
    expect(
      screen.getByText('На наступну перевірку юнітів може не вистачити.'),
    ).toBeInTheDocument()
  })
})
