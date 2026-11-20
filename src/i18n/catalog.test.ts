import { describe, expect, it } from 'vitest'
import { IntlMessageFormat } from 'intl-messageformat'
import ukPanel from './catalogs/uk/panel.json'
import ukPortal from './catalogs/uk/portal.json'
import ukShared from './catalogs/uk/shared.json'
import enShared from './catalogs/en/shared.json'
import { localeOf } from './languages'
import { SOURCES, literalsOf } from './sourceScan'

// The Ukrainian catalog against the code: every key the code names is there,
// every key there is named by the code, and every message is ICU the
// formatter reads. Keys are written out in full where they are used — never
// built from parts — so this reading of the code finds them all.

const KEY = /^(portal|shared|panel)(\.[A-Za-z0-9]+){2,}$/

const catalogs = {
  'portal.json': ukPortal,
  'shared.json': ukShared,
  'panel.json': ukPanel,
} as Record<string, Record<string, string>>
const uk: Record<string, string> = { ...ukShared, ...ukPortal, ...ukPanel }

const used = new Set(
  Object.keys(SOURCES).flatMap((file) => literalsOf(file).filter((text) => KEY.test(text))),
)

describe('the uk catalog', () => {
  it('each file holds its own keys, and no key is in both', () => {
    expect(Object.keys(ukPortal).every((key) => key.startsWith('portal.'))).toBe(true)
    expect(Object.keys(ukShared).every((key) => key.startsWith('shared.'))).toBe(true)
    expect(Object.keys(ukPanel).every((key) => key.startsWith('panel.'))).toBe(true)
    expect(Object.keys(uk)).toHaveLength(
      Object.keys(ukPortal).length + Object.keys(ukShared).length + Object.keys(ukPanel).length,
    )
  })

  it('has every key the code uses', () => {
    expect(used.size).toBeGreaterThan(200)
    expect([...used].filter((key) => !(key in uk))).toEqual([])
  })

  it('has no key the code does not use', () => {
    expect(Object.keys(uk).filter((key) => !used.has(key))).toEqual([])
  })

  it.each(Object.entries(catalogs))('every message of %s is ICU MessageFormat', (_, catalog) => {
    const broken = Object.entries(catalog).filter(([, message]) => {
      try {
        new IntlMessageFormat(message, localeOf('uk'))
        return false
      } catch {
        return true
      }
    })
    expect(broken).toEqual([])
  })

  it('the consent checkbox line holds the words its two links are made of', () => {
    expect(uk['shared.consent.checkbox']).toContain(uk['shared.consent.termsLinkWords'])
    expect(uk['shared.consent.checkbox']).toContain(uk['shared.consent.refundsLinkWords'])
  })

  it('the consent checkbox line holds the words of its two links in en too', () => {
    expect(enShared['shared.consent.checkbox']).toContain(enShared['shared.consent.termsLinkWords'])
    expect(enShared['shared.consent.checkbox']).toContain(enShared['shared.consent.refundsLinkWords'])
  })

  it('names the author of the course, never a teacher (5.6)', () => {
    // Built from parts, so this file holds no copy of the word it looks for.
    const teacher = ['викла', 'дач'].join('')
    expect(Object.values(uk).filter((m) => m.toLowerCase().includes(teacher))).toEqual([])
  })
})
