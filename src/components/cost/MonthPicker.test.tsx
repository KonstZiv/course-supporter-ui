import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { MonthPicker } from './MonthPicker'

const NOVEMBER = { year: 2026, month: 10 }

describe('MonthPicker', () => {
  it('shows the month name in Ukrainian', () => {
    render(
      <LanguageProvider language="uk">
        <MonthPicker month={NOVEMBER} current={NOVEMBER} onChange={vi.fn()} />
      </LanguageProvider>,
    )
    expect(screen.getByText('листопад 2026')).toBeInTheDocument()
  })

  it('shows the month name in English', () => {
    render(
      <LanguageProvider language="en">
        <MonthPicker month={NOVEMBER} current={NOVEMBER} onChange={vi.fn()} />
      </LanguageProvider>,
    )
    expect(screen.getByText('November 2026')).toBeInTheDocument()
  })
})
