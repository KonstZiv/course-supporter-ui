import { describe, expect, it } from 'vitest'
import { formatCount, noteLength, STUDENT_NOTE_MAX_CHARS } from './studentNote'

describe('the student comment cap (hotfix 6)', () => {
  it('is the number the server refuses above', () => {
    // backend: homework/submission_core.py, STUDENT_NOTE_MAX_CHARS
    expect(STUDENT_NOTE_MAX_CHARS).toBe(2000)
  })
})

describe('noteLength — counted as the server counts', () => {
  it('counts an emoji once, not as its two UTF-16 units', () => {
    expect('🙂'.length).toBe(2)
    expect(noteLength('🙂'.repeat(10))).toBe(10)
  })

  it('counts a line break once', () => {
    expect(noteLength('а\nб')).toBe(3)
  })

  it('leaves the edges out, as the form sends the trimmed text', () => {
    expect(noteLength('  \n питання \t\n')).toBe('питання'.length)
    expect(noteLength(' \n ')).toBe(0)
  })
})

describe('formatCount', () => {
  it('groups thousands with a no-break space', () => {
    expect(formatCount(2000)).toBe('2\u00a0000')
    expect(formatCount(1234567)).toBe('1\u00a0234\u00a0567')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(0)).toBe('0')
  })
})
