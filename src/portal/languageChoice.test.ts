import { describe, expect, it } from 'vitest'
import { resolveLanguage } from './languageChoice'

// Г-1 §3: the first source that names an enabled language wins.

describe('resolveLanguage — the order of the sources', () => {
  it('1. the choice just made with the switcher beats everything', () => {
    expect(
      resolveLanguage({ picked: 'en', server: 'ukr', query: 'uk', stored: 'uk', browser: ['uk-UA'] }),
    ).toBe('en')
  })

  it('2. the server choice beats the address, the browser and the default', () => {
    expect(resolveLanguage({ server: 'eng', query: 'uk', stored: 'uk', browser: ['uk-UA'] })).toBe('en')
    expect(resolveLanguage({ server: 'ukr', query: 'en', stored: 'en', browser: ['en-GB'] })).toBe('uk')
  })

  it('2. a server choice the portal does not speak counts as none', () => {
    expect(resolveLanguage({ server: 'deu', query: 'en' })).toBe('en')
    expect(resolveLanguage({ server: null, stored: 'en' })).toBe('en')
  })

  it('3. ?lang= beats the stored choice and the browser', () => {
    expect(resolveLanguage({ query: 'en', stored: 'uk', browser: ['uk'] })).toBe('en')
    expect(resolveLanguage({ query: 'fr', stored: 'en' })).toBe('en')
  })

  it('4. the choice stored in this browser beats the browser language', () => {
    expect(resolveLanguage({ stored: 'en', browser: ['uk-UA'] })).toBe('en')
    expect(resolveLanguage({ stored: 'xx', browser: ['en-US'] })).toBe('en')
  })

  it('5. the first of the browser languages the portal speaks', () => {
    expect(resolveLanguage({ browser: ['de-DE', 'en-US', 'uk'] })).toBe('en')
    expect(resolveLanguage({ browser: ['uk-UA', 'en'] })).toBe('uk')
  })

  it('6. else the default — Ukrainian', () => {
    expect(resolveLanguage({})).toBe('uk')
    expect(resolveLanguage({ browser: ['de', 'fr-FR'] })).toBe('uk')
  })
})
