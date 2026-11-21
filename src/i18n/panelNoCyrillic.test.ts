import { describe, expect, it } from 'vitest'
import { importGraph, literalsOf } from './sourceScan'

const files = importGraph('/src/main.tsx')

const ALLOWED: Record<string, Record<string, string>> = {
  '/src/i18n/languages.ts': {
    'Українська': 'the name of the language in that language — never translated',
  },
  '/src/utils/testLetters.ts': {
    'абвгдеєжзиіїклмнопрстуфхцчшщюя':
      'the option letters of a course in Ukrainian — course data mirroring the backend, not interface text',
  },
}

const CYRILLIC = /[Ѐ-ӿ]/

describe('the author panel migrated files have no Cyrillic', () => {
  it('no literal in migrated files contains Cyrillic characters', () => {
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
