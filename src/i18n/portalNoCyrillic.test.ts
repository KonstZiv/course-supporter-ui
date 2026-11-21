import { describe, expect, it } from 'vitest'
import { importGraph, literalsOf } from './sourceScan'

// Every word the portal shows comes from a catalog: no Cyrillic literal is
// left in the code the portal is built from — its own files and the shared
// ones it imports. Comments are not code and may quote the words they explain.

const CYRILLIC = /[Ѐ-ӿ]/

// What must stay, each with its reason.
const ALLOWED: Record<string, Record<string, string>> = {
  '/src/i18n/languages.ts': {
    'Українська': 'the name of the language in that language — never translated',
  },
}

const files = importGraph('/src/portal/main.tsx')

describe('the portal code has no Cyrillic', () => {
  it('follows the imports of the entry into the shared modules', () => {
    expect(files.length).toBeGreaterThan(60)
    expect(files).toContain('/src/portal/App.tsx')
    expect(files).toContain('/src/utils/units.ts')
    expect(files).toContain('/src/components/billing/PackagesPurchase.tsx')
  })

  it('no literal outside the allowed list', () => {
    const found = files.flatMap((file) =>
      literalsOf(file)
        .filter((text) => CYRILLIC.test(text) && !(text in (ALLOWED[file] ?? {})))
        .map((text) => `${file}: ${text}`),
    )
    expect(found).toEqual([])
  })

  it('the allowed list holds nothing stale', () => {
    for (const [file, allowed] of Object.entries(ALLOWED)) {
      expect(files).toContain(file)
      const literals = literalsOf(file)
      for (const text of Object.keys(allowed)) expect(literals).toContain(text)
    }
  })
})
