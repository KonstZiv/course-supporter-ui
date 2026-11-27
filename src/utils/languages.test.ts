import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AllowedLanguagesResponse } from '../types/api'

// Task 2.4.13 — guard the singleton's error-path invariant: a failed
// fetch must NOT poison the cache for the rest of the session. Tested
// in isolation here (not in DashboardPage.test.tsx) because the
// module-level ``_cache``/``_inflight`` state persists across calls
// and needs ``vi.resetModules()`` per test to start cold. Keeping
// these assertions in their own file keeps the page-level tests free
// of that machinery.

const mockGetLanguages = vi.fn<() => Promise<AllowedLanguagesResponse>>()

vi.mock('../api/config', () => ({
  configApi: { getLanguages: mockGetLanguages },
}))

beforeEach(() => {
  // Fresh module instance so ``_cache`` / ``_inflight`` start cold.
  vi.resetModules()
  mockGetLanguages.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('utils/languages — singleton + error-path invariant', () => {
  it('caches the result and serves subsequent calls without re-fetching', async () => {
    mockGetLanguages.mockResolvedValueOnce({
      items: [{ code: 'ukr', name_en: 'Ukrainian', name_native: null }],
      total: 1,
    })
    const { getLanguages, getCachedLanguages } = await import('./languages')

    const first = await getLanguages()
    expect(first).toEqual([{ code: 'ukr', name_en: 'Ukrainian', name_native: null }])
    expect(getCachedLanguages()).toEqual(first)
    expect(mockGetLanguages).toHaveBeenCalledTimes(1)

    // Second call returns the cached array — no extra fetch.
    const second = await getLanguages()
    expect(second).toBe(first)
    expect(mockGetLanguages).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed fetch (does not stay poisoned)', async () => {
    // First call rejects (401 / 500 / network blip — same shape from the
    // caller's POV); second call resolves with the real list.
    mockGetLanguages
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        items: [{ code: 'eng', name_en: 'English', name_native: null }],
        total: 1,
      })
    const { getLanguages, getCachedLanguages } = await import('./languages')

    await expect(getLanguages()).rejects.toThrow('boom')
    expect(getCachedLanguages()).toBeNull()
    expect(mockGetLanguages).toHaveBeenCalledTimes(1)

    // Crucial assertion: the singleton retried instead of returning the
    // poisoned rejected promise from the first attempt.
    const recovered = await getLanguages()
    expect(recovered).toEqual([{ code: 'eng', name_en: 'English', name_native: null }])
    expect(mockGetLanguages).toHaveBeenCalledTimes(2)
    expect(getCachedLanguages()).toEqual(recovered)
  })

  it('findLanguage returns null when the cache is cold', async () => {
    const { findLanguage } = await import('./languages')
    expect(findLanguage('ukr')).toBeNull()
    expect(findLanguage(null)).toBeNull()
  })

  it('languageDisplayName formats known codes in the interface language and falls back to name_en for unknown codes', async () => {
    mockGetLanguages.mockResolvedValueOnce({
      items: [
        { code: 'ukr', name_en: 'Ukrainian', name_native: 'Українська' },
        { code: 'zzz', name_en: 'Customlang', name_native: null },
      ],
      total: 2,
    })
    const { getLanguages, languageDisplayName } = await import('./languages')
    await getLanguages()

    expect(languageDisplayName('uk', 'uk')).toBe('українська')
    expect(languageDisplayName('uk', 'en')).toBe('Ukrainian')
    expect(languageDisplayName('ukr', 'uk')).toBe('українська')
    expect(languageDisplayName('ukr', 'en')).toBe('Ukrainian')
    expect(languageDisplayName('zzz', 'uk', 'Customlang')).toBe('Customlang')
    expect(languageDisplayName('zzz', 'uk')).toBe('Customlang')
    expect(languageDisplayName('123', 'uk', 'Fallback Name')).toBe('Fallback Name')
  })
})
