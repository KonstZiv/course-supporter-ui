import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatNumber,
  formatPackageName,
  formatPriceEur,
  formatSignedNumber,
  formatUnits,
} from './units'

// Thousands are grouped with a no-break space, as on the site's pricing page.
const NB = ' '

describe('formatUnits', () => {
  it.each([
    [1, '1 юніт'],
    [2, '2 юніти'],
    [5, '5 юнітів'],
    [11, '11 юнітів'],
    [21, '21 юніт'],
    [0, '0 юнітів'],
    [1500, `1${NB}500 юнітів`],
    [10000, `10${NB}000 юнітів`],
  ])('%i → %s', (n, text) => {
    expect(formatUnits(n)).toBe(text)
  })
})

describe('formatPackageName', () => {
  it('names a package as the site does', () => {
    expect(formatPackageName(500)).toBe('500 юнітів')
    expect(formatPackageName(1500)).toBe(`1${NB}500 юнітів`)
  })
})

describe('formatPriceEur', () => {
  it.each([
    [999, '9,99 EUR'],
    [6999, '69,99 EUR'],
    [1500, '15,00 EUR'],
  ])('%i cents → %s', (minor, text) => {
    expect(formatPriceEur(minor)).toBe(text)
  })
})

describe('formatDate', () => {
  it('writes a day without the "р." after the year', () => {
    expect(formatDate('2026-11-15')).toBe('15 листопада 2026')
  })

  it('reads a moment on its day in the reader time zone', () => {
    expect(formatDate('2026-03-02T12:00:00Z')).toBe('2 березня 2026')
  })
})

describe('formatNumber / formatSignedNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1500)).toBe(`1${NB}500`)
  })

  it('signs a change with plus or the minus sign U+2212', () => {
    expect(formatSignedNumber(500)).toBe('+500')
    expect(formatSignedNumber(-120)).toBe('−120')
    expect(formatSignedNumber(-1500)).toBe(`−1${NB}500`)
    expect(formatSignedNumber(0)).toBe('0')
  })
})
