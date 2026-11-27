import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '../../i18n/LanguageProvider'
import { LanguageBadge, LanguageSelect } from './LanguageSelect'

const mockGetLanguages = vi.hoisted(() => vi.fn())

vi.mock('../../api/config', () => ({
  configApi: { getLanguages: mockGetLanguages },
}))

describe('LanguageSelect & LanguageBadge', () => {
  beforeEach(async () => {
    mockGetLanguages.mockResolvedValue({
      items: [
        { code: 'pol', name_en: 'Polish', name_native: 'polski' },
        { code: 'ukr', name_en: 'Ukrainian', name_native: 'українська' },
        { code: 'eng', name_en: 'English', name_native: 'English' },
      ],
      total: 3,
    })
    const { getLanguages } = await import('../../utils/languages')
    await getLanguages()
  })

  it('renders language names in Ukrainian and preserves server order', () => {
    render(
      <LanguageProvider language="uk">
        <LanguageSelect value={null} onChange={vi.fn()} />
        <LanguageBadge code="ukr" />
      </LanguageProvider>,
    )

    const options = screen
      .getAllByRole('option')
      .map((opt) => opt.textContent)
    expect(options).toEqual([
      '🔍 Автовизначення',
      'польська',
      'українська',
      'англійська',
    ])
    expect(screen.getByText('українська', { selector: 'span' })).toBeInTheDocument()
  })

  it('renders language names in English when interface language is en', () => {
    render(
      <LanguageProvider language="en">
        <LanguageSelect value={null} onChange={vi.fn()} />
        <LanguageBadge code="ukr" />
      </LanguageProvider>,
    )

    const options = screen
      .getAllByRole('option')
      .map((opt) => opt.textContent)
    expect(options.slice(1)).toEqual([
      'Polish',
      'Ukrainian',
      'English',
    ])
    expect(screen.getByText('Ukrainian', { selector: 'span' })).toBeInTheDocument()
  })
})
