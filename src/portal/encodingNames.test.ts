import { describe, expect, it } from 'vitest'
import { encodingDisplayName, shouldReportEncoding } from './encodingNames'

describe('shouldReportEncoding', () => {
  it('reports a recovered encoding', () => {
    expect(shouldReportEncoding('cp1251')).toBe(true)
  })

  it('says nothing about an ordinary UTF-8 file', () => {
    // Every plain submission carries "utf-8"; a note on each would train the
    // eye past the place the real caveat appears.
    expect(shouldReportEncoding('utf-8')).toBe(false)
    expect(shouldReportEncoding('UTF-8')).toBe(false)
  })

  it('says nothing when the question does not apply', () => {
    // Archives and documents carry null — the absence of one answer, not an
    // answer of "it was fine".
    expect(shouldReportEncoding(null)).toBe(false)
    expect(shouldReportEncoding('')).toBe(false)
  })
})

describe('encodingDisplayName', () => {
  it('names the encoding this platform actually meets', () => {
    expect(encodingDisplayName('cp1251')).toBe('Windows, кирилиця')
  })

  it('gives one text one answer under either library name', () => {
    // The server merges encodings that decode identically; which name comes
    // back depends on the file, and the student must not see two answers for
    // the same thing.
    expect(encodingDisplayName('kz1048')).toBe(encodingDisplayName('cp1251'))
    expect(encodingDisplayName('windows-1251')).toBe(encodingDisplayName('cp1251'))
  })

  it('is case-insensitive — casing carries no meaning here', () => {
    expect(encodingDisplayName('CP1251')).toBe('Windows, кирилиця')
  })

  it('falls back to the raw token in parentheses, never to nothing', () => {
    // "recognised as ___" with a blank is worse than an unfamiliar name: the
    // student learns the file was rescued and not what as.
    expect(encodingDisplayName('shift_jis')).toBe('(shift_jis)')
  })
})
