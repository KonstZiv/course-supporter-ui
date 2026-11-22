import { describe, expect, it } from 'vitest'
import { importGraph, SOURCES } from './sourceScan'

const files = importGraph('/src/main.tsx').filter((file) => !file.includes('.test.'))
const FIXED_UK_CALL = /\(\s*['"]uk['"]\s*[,)]/

describe('the author panel has no hardcoded "uk" calls', () => {
  it('no call in panel import graph passes hardcoded "uk"', () => {
    const found = files.flatMap((file) => {
      const source = SOURCES[file] ?? ''
      return source
        .split('\n')
        .flatMap((line, idx) => (FIXED_UK_CALL.test(line) ? [`${file}: ${idx + 1}`] : []))
    })
    expect(found).toEqual([])
  })
})
