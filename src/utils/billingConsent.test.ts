import { describe, expect, it } from 'vitest'
import {
  CONSENT_LINES,
  CONSENT_TEXT,
  consentLines,
  consentSha256,
  consentText,
  STUDENT_CONSENT_LINES,
} from './billingConsent'

describe('billing consent text', () => {
  it('is exactly the four lines, in order', () => {
    expect(CONSENT_LINES).toEqual([
      'Перед купівлею юнітів підтвердьте:',
      'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
      'Коротко: юніт — не гроші й не платіжний засіб, його не можна обміняти на гроші, продати чи передати; пакет діє шість місяців; за невикористані юніти чинного пакета ви можете отримати повернення оплати.',
      'Якщо умови зміняться, ми попросимо вас підтвердити їх знову.',
    ])
    expect(CONSENT_TEXT.split('\n')).toHaveLength(4)
    expect(CONSENT_TEXT.endsWith('\n')).toBe(false)
    expect(CONSENT_TEXT).toHaveLength(371)
    expect(new TextEncoder().encode(CONSENT_TEXT)).toHaveLength(677)
  })

  it('has the fingerprint the server records', async () => {
    expect(await consentSha256()).toBe(
      '720b66e24bb1b00ee44ed066123e075b82a2c4c1f1ac18f1abeabf9914c63749',
    )
  })
})

describe('student consent text', () => {
  it('is exactly the four lines of the portal, in order', () => {
    expect(STUDENT_CONSENT_LINES).toEqual([
      'Перед першою купівлею підтвердьте:',
      'Я прочитав(ла) й приймаю умови користування та правила повернення оплати.',
      'Коротко: юніт — не гроші й не платіжний засіб, його не можна обміняти на гроші, продати чи передати; пакет діє шість місяців; за невикористані юніти чинного пакета ви можете отримати повернення оплати.',
      'Якщо умови зміняться, ми попросимо вас підтвердити їх знову.',
    ])
    const text = consentText(STUDENT_CONSENT_LINES)
    expect(text.split('\n')).toHaveLength(4)
    expect(text.endsWith('\n')).toBe(false)
    expect(text).toHaveLength(371)
  })

  it('has the fingerprint the server records', async () => {
    expect(await consentSha256(STUDENT_CONSENT_LINES)).toBe(
      'ff89a2f5ebab4d8f5956fcc590160d961283b414a8e953bec428d5c06d6cb33f',
    )
  })

  it('leaves the author text as it was without an argument', async () => {
    expect(consentText()).toBe(CONSENT_TEXT)
    expect(await consentSha256()).toBe(await consentSha256(CONSENT_LINES))
  })
})

describe('consent fingerprints of every text the server accepts', () => {
  // SHA-256 of the four lines joined by "\n", UTF-8, hex. The window's text
  // is in the language of the pages; the server records only the fingerprint.
  it.each([
    ['uk', 'author', '720b66e24bb1b00ee44ed066123e075b82a2c4c1f1ac18f1abeabf9914c63749'],
    ['uk', 'student', 'ff89a2f5ebab4d8f5956fcc590160d961283b414a8e953bec428d5c06d6cb33f'],
    ['en', 'author', 'd47f042443c8cb1eb59b0c441757ec56c06d05e6578618fd5aeed949ffdfc266'],
    ['en', 'student', '2965019285e14659b1d47fa9759bfcc74f4e7a092c96c17084ce631615e2286d'],
  ] as const)('%s, %s', async (language, holder, sha256) => {
    expect(await consentSha256(consentLines(language, holder))).toBe(sha256)
  })

  it('the English student text is these four lines', () => {
    expect(consentLines('en', 'student')).toEqual([
      'Before your first purchase, please confirm:',
      'I have read and accept the Terms of Use and the Refunds rules.',
      'In short: a unit is not money and not a means of payment, and cannot be exchanged for money, sold or transferred; a package is valid for six months; you can get a refund for the unused units of a valid package.',
      'If the terms change, we will ask you to confirm them again.',
    ])
  })
})
