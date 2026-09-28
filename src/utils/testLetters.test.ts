import { describe, it, expect } from 'vitest'
import { MAX_OPTIONS, optionLetters } from './testLetters'

// The backend's own sequences — ``option_letters`` of homework/test_object.py
// prints these in its doctests. Written out here, never derived from the
// module's string, or the two would agree by construction.
const UKRAINIAN = 'абвгдеєжзиіїклмнопрстуфхцч'
const LATIN = 'abcdefghijklmnopqrstuvwxyz'

describe('optionLetters', () => {
  it('letters a Ukrainian course without ґ, й and ь', () => {
    const letters = optionLetters('ukr')

    expect(letters.join('')).toBe(UKRAINIAN)
    expect(letters).toHaveLength(MAX_OPTIONS)
    for (const skipped of ['ґ', 'й', 'ь']) {
      expect(letters).not.toContain(skipped)
    }
  })

  it('letters every other language with Latin letters', () => {
    for (const language of ['eng', 'deu', 'pol', null]) {
      expect(optionLetters(language).join('')).toBe(LATIN)
    }
  })
})
