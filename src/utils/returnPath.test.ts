import { describe, it, expect } from 'vitest'
import { returnPath } from './returnPath'

describe('returnPath', () => {
  it.each(['/', '/students', '/students?x=1', '/billing?checkout=abc', '/course/n1#top'])(
    'takes a path inside the program: %s',
    (from) => {
      expect(returnPath(from)).toBe(from)
    },
  )

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    'students',
    '',
  ])('falls back to the courses for an address off the program: %s', (from) => {
    expect(returnPath(from)).toBe('/')
  })

  it.each([undefined, null, 42, { pathname: '/students' }])(
    'falls back to the courses when there is no address: %s',
    (from) => {
      expect(returnPath(from)).toBe('/')
    },
  )
})
