import { describe, expect, it } from 'vitest'
import { submissionCodePhrase } from './submissionCodes'

describe('submissionCodePhrase (KD18 P5 submit-preflight codes)', () => {
  it.each([
    ['ARCHIVE_ONLY', /архів проєкту/],
    ['BASE_NOT_READY', /ще готується/],
    ['MISSING_BASE_ECHO', /визначити версію/],
    ['UNKNOWN_BASE_ECHO', /оновився/],
  ])('%s → its uk phrase', (code, re) => {
    expect(submissionCodePhrase(code)).toMatch(re)
  })

  it('unknown code → falls back to the backend detail', () => {
    expect(submissionCodePhrase('SOME_NEW_CODE', 'backend detail here')).toBe(
      'backend detail here',
    )
  })

  it('unknown code with no detail → a generic phrase', () => {
    expect(submissionCodePhrase('SOME_NEW_CODE')).toBe('Файл не прийнято.')
  })
})
