import { describe, expect, it } from 'vitest'
import { submissionCodePhrase } from './submissionCodes'

describe('submissionCodePhrase — the UPPER_SNAKE project vocabulary', () => {
  it.each([
    ['ARCHIVE_ONLY', /архів проєкту/],
    ['BASE_NOT_READY', /ще готується/],
    ['MISSING_BASE_ECHO', /визначити версію/],
    ['UNKNOWN_BASE_ECHO', /оновився/],
  ])('%s → its uk phrase', (code, re) => {
    expect(submissionCodePhrase(code)).toMatch(re)
  })
})

describe('submissionCodePhrase — the lower_snake ErrorCategory vocabulary', () => {
  // The ordinary submission door speaks ErrorCategory values, not project codes.
  // Both arrive at the same handler, so both must resolve here.
  it('forbidden_type → the ratified format phrase, listing what IS accepted', () => {
    expect(submissionCodePhrase('forbidden_type')).toBe(
      'Цей формат файла не приймається. Надішліть роботу текстом (.md, .txt), ' +
        'документом (.docx, .pdf), кодом або архівом (.zip, .tar.gz).',
    )
  })

  it('size_limit → the ratified size phrase, with no number in it', () => {
    const phrase = submissionCodePhrase('size_limit')
    expect(phrase).toMatch(/більший за дозволений розмір/)
    // The cap differs by task type (an ordinary submission and a project
    // submission do not share it), so the sentence must not name one.
    expect(phrase).not.toMatch(/\d/)
  })

  it('says the same thing the stored attempt will say later', async () => {
    const { rejectionPhrase } = await import('./rejectionReasons')
    expect(submissionCodePhrase('size_limit')).toBe(
      rejectionPhrase({ code: 'size_limit', details: 'work.zip' }),
    )
  })
})

describe('submissionCodePhrase — unknown codes (DD-SP-D)', () => {
  it('yields the ratified generic, not silence', () => {
    expect(submissionCodePhrase('SOME_NEW_CODE')).toBe(
      'Під час обробки подачі сталася помилка. Спробуйте подати ще раз.',
    )
  })

  it('has no way to leak the backend string — it no longer takes one', () => {
    // The signature itself is the guarantee: the raw ``details`` is an English
    // developer sentence, and the old fallback put it in front of the student.
    expect(submissionCodePhrase.length).toBe(1)
  })
})
