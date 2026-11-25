import { describe, expect, it } from 'vitest'
import { PortalApiError } from './api/portalClient'
import {
  courseLanguageNames,
  emailLoginAddress,
  joinAddress,
  joinSentAddress,
  rateLimitedText,
  retryMinutes,
  signupFieldFailure,
} from './openCourses'

const limited = (retryAfter: number | null) =>
  new PortalApiError(429, 'x', { detail: { code: 'rate_limited', details: 'x' } }, retryAfter)

describe('open courses: the words of a refusal', () => {
  it('a 429 waits whole minutes, rounded up', () => {
    expect(retryMinutes(limited(1))).toBe(1)
    expect(retryMinutes(limited(60))).toBe(1)
    expect(retryMinutes(limited(61))).toBe(2)
    expect(retryMinutes(limited(3600))).toBe(60)
    expect(retryMinutes(limited(null))).toBeNull()
    expect(retryMinutes(new PortalApiError(404, 'x', null, 30))).toBeNull()
  })

  it('says the minutes, and only them — no number of a limit', () => {
    expect(rateLimitedText('uk', limited(61))).toBe('Забагато спроб. Спробуйте через 2 хв.')
    expect(rateLimitedText('en', limited(61))).toBe('Too many attempts. Please try again in 2 min.')
    expect(rateLimitedText('uk', limited(null))).toBe('Забагато спроб. Спробуйте трохи згодом.')
  })

  it('a 422 by its field: a weak password, an email, the rest', () => {
    const weak = new PortalApiError(422, 'x', { detail: 'Password must be at least 10 characters.' })
    const list = (field: string) =>
      new PortalApiError(422, 'x', { detail: [{ type: 'x', loc: ['body', field], msg: 'x' }] })
    expect(signupFieldFailure(weak)).toBe('weakPassword')
    expect(signupFieldFailure(list('password'))).toBe('weakPassword')
    expect(signupFieldFailure(list('email'))).toBe('invalidEmail')
    expect(signupFieldFailure(list('interface_language'))).toBe('invalidForm')
    expect(signupFieldFailure(new PortalApiError(409, 'x', null))).toBeNull()
  })
})

describe('open courses: names and addresses', () => {
  it('names the course languages in the language of the pages', () => {
    expect(courseLanguageNames('en', ['ukr', 'eng'])).toBe('Ukrainian, English')
    expect(courseLanguageNames('uk', ['ukr', 'eng'])).toBe('українська, англійська')
  })

  it('builds the addresses of the enrollment pages', () => {
    const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
    expect(joinAddress(T, 'a/b')).toBe(`/${T}/join/a%2Fb`)
    expect(joinSentAddress(T, 'k', 's-1')).toBe(`/${T}/join/k/sent?signup=s-1`)
    expect(emailLoginAddress()).toBe('/login')
    expect(emailLoginAddress(`/${T}/join/k`)).toBe(`/login?next=%2F${T}%2Fjoin%2Fk`)
  })
})
