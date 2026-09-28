import { describe, expect, it } from 'vitest'
import { documentLabel } from './documentLabel'

describe('documentLabel', () => {
  it('names a document by its title first', () => {
    const test = {
      title: 'Змінні',
      filename: null,
      source_url: 'test-object:',
      source_type: 'test_object' as const,
    }
    expect(documentLabel(test)).toBe('Змінні')
    expect(documentLabel({ ...test, filename: 'quiz.yaml' })).toBe('Змінні')
    expect(
      documentLabel({
        title: null,
        filename: 'lesson.pdf',
        source_url: 's3://bucket/lesson.pdf',
        source_type: 'presentation',
      }),
    ).toBe('lesson.pdf')
    expect(
      documentLabel({
        title: null,
        filename: null,
        source_url: 'https://youtu.be/x',
        source_type: 'video',
      }),
    ).toBe('https://youtu.be/x')
    expect(
      documentLabel({ title: '', filename: '', source_url: '', source_type: 'web' }),
    ).toBe('web')
  })
})
