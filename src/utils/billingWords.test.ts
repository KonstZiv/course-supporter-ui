import { describe, expect, it } from 'vitest'
import {
  ACTION_FAILURE_TEXT,
  actionFailure,
  NETWORK_FAILED,
  PACKAGE_NOT_FOUND,
  statementLineText,
} from './billingWords'

describe('actionFailure', () => {
  it('picks the failure by the reason code, then by whether the server answered', () => {
    expect(actionFailure('package_not_found', true)).toBe('package_not_found')
    expect(actionFailure('provider_unavailable', true)).toBe('provider_unavailable')
    expect(actionFailure('provider_not_found', true)).toBe('refused')
    expect(actionFailure(null, true)).toBe('refused')
    expect(actionFailure(null, false)).toBe('unreachable')
  })

  it('has the author words for each', () => {
    expect(ACTION_FAILURE_TEXT.package_not_found).toBe(PACKAGE_NOT_FOUND)
    expect(ACTION_FAILURE_TEXT.unreachable).toBe(NETWORK_FAILED)
  })
})

describe('statementLineText', () => {
  it('a review charge reads as the review of a work', () => {
    expect(
      statementLineText({ kind: 'charge', action: { kind: 'review', id: 'a' } }),
    ).toBe('Перевірка роботи')
  })
})
