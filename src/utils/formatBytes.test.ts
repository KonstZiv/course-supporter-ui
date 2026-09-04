import { describe, expect, it } from 'vitest'
import { formatBytes } from './formatBytes'

describe('formatBytes', () => {
  it.each([
    [6, '6 Б'],
    [40, '40 Б'],
    [1023, '1023 Б'],
    [1024, '1,0 КБ'],
    [24_000, '23 КБ'],
    [4 * 1024 * 1024, '4,0 МБ'],
    [6_291_456, '6,0 МБ'],
  ])('%i → %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })

  it('uses the decimal comma Ukrainian writes', () => {
    expect(formatBytes(1536)).toBe('1,5 КБ')
    expect(formatBytes(1536)).not.toContain('.')
  })
})
