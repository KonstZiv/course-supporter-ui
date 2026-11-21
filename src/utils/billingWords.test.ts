import { describe, expect, it } from 'vitest'
import { translate } from '../i18n/translate'
import { actionFailureText } from './authorBillingTexts'
import { actionFailure, statementLineText } from './billingWords'

const NETWORK_FAILED = translate('uk', 'shared.billing.networkFailed')
const PACKAGE_NOT_FOUND = translate('uk', 'shared.billing.packageNotFound')

describe('actionFailure', () => {
  it('picks the failure by the reason code, then by whether the server answered', () => {
    expect(actionFailure('package_not_found', true)).toBe('package_not_found')
    expect(actionFailure('provider_unavailable', true)).toBe('provider_unavailable')
    expect(actionFailure('provider_not_found', true)).toBe('refused')
    expect(actionFailure(null, true)).toBe('refused')
    expect(actionFailure(null, false)).toBe('unreachable')
  })

  it('has the author words for each', () => {
    expect(actionFailureText('uk').package_not_found).toBe(PACKAGE_NOT_FOUND)
    expect(actionFailureText('uk').unreachable).toBe(NETWORK_FAILED)
  })
})

describe('statementLineText', () => {
  it('a review charge reads as the review of a work', () => {
    expect(
      statementLineText('uk', { kind: 'charge', action: { kind: 'review', id: 'a' } }),
    ).toBe('Перевірка роботи')
  })
})
