import { describe, expect, it } from 'vitest'
import { afterSignIn, loginAddress, nextOf } from './signInReturn'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const OTHER = '019edb00-0000-7000-8000-000000000002'

describe('loginAddress', () => {
  it('is the tenant sign-in page, without next when there is none', () => {
    expect(loginAddress(T)).toBe(`/${T}/login`)
    expect(loginAddress(T, null)).toBe(`/${T}/login`)
    expect(loginAddress(T, '')).toBe(`/${T}/login`)
  })

  it('carries the way back, encoded, and gives it back decoded', () => {
    const next = `/${T}/billing?checkout=a b&x=1`
    const address = loginAddress(T, next)
    expect(address).toBe(`/${T}/login?next=${encodeURIComponent(next)}`)
    expect(nextOf(new URL(address, 'https://campus.example').searchParams)).toBe(next)
  })
})

describe('afterSignIn', () => {
  it('leads to next when it is a page of this very tenant', () => {
    expect(afterSignIn(T, `/${T}/billing/checkouts/abc`)).toBe(
      `/${T}/billing/checkouts/abc`,
    )
    expect(afterSignIn(T, `/${T}/billing?checkout=abc`)).toBe(
      `/${T}/billing?checkout=abc`,
    )
  })

  it.each([
    ['no next', null],
    ['another tenant', `/${OTHER}/billing`],
    ['a path with //', `/${T}//evil.example`],
    ['a protocol-relative address', '//evil.example/x'],
    ['another site', 'https://evil.example/'],
    ['a backslash', `/${T}/\\evil.example`],
    ['the bare tenant', `/${T}`],
    ['a relative path', 'billing'],
  ])('leads home for %s', (_, next) => {
    expect(afterSignIn(T, next)).toBe(`/${T}/home`)
  })
})
