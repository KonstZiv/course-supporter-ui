import { describe, expect, it } from 'vitest'
import {
  CONSENT_LINES,
  CONSENT_TEXT,
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
