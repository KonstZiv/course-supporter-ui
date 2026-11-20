import { describe, expect, it } from 'vitest'
import {
  enabledLanguages,
  iso3Of,
  languageFromCode,
  languageFromIso3,
  LANGUAGES,
} from './languages'

describe('the list of languages', () => {
  it('speaks Ukrainian and English', () => {
    expect(enabledLanguages().map((l) => l.code)).toEqual(['uk', 'en'])
  })

  it('names each language by the server code', () => {
    expect(iso3Of('uk')).toBe('ukr')
    expect(iso3Of('en')).toBe('eng')
    expect(new Set(LANGUAGES.map((l) => l.iso3)).size).toBe(LANGUAGES.length)
  })

  it('reads a server code: enabled languages only', () => {
    expect(languageFromIso3('eng')).toBe('en')
    expect(languageFromIso3('UKR')).toBe('uk')
    expect(languageFromIso3('deu')).toBeNull()
    expect(languageFromIso3('')).toBeNull()
    expect(languageFromIso3(null)).toBeNull()
    expect(languageFromIso3(undefined)).toBeNull()
  })

  it('reads a code from an address or a browser', () => {
    expect(languageFromCode('en')).toBe('en')
    expect(languageFromCode('en-GB')).toBe('en')
    expect(languageFromCode('uk-UA')).toBe('uk')
    expect(languageFromCode('uk_UA')).toBe('uk')
    expect(languageFromCode('EN')).toBe('en')
    expect(languageFromCode('eng')).toBe('en')
    expect(languageFromCode('de-DE')).toBeNull()
    expect(languageFromCode('e')).toBeNull()
    expect(languageFromCode(null)).toBeNull()
  })
})
