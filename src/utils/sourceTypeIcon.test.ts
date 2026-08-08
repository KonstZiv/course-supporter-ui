import { describe, it, expect } from 'vitest'
import type { SourceType } from '../types/api'
import { sourceTypeMeta } from './sourceTypeIcon'

// Re-declared independently of the union type (a hand-written witness — never
// derived from SourceType, or it would agree by construction).
const ALL_SOURCE_TYPES: SourceType[] = [
  'video',
  'presentation',
  'text',
  'web',
  'audio',
  'code',
]

describe('sourceTypeMeta', () => {
  it('returns audio meta for "audio" source_type (Phase 2.2 UI sub-area item #4)', () => {
    expect(sourceTypeMeta('audio')).toEqual({
      label: 'Аудіо',
      icon: 'AudioLines',
      color: 'text-amber',
    })
  })

  it('preserves existing cases unchanged', () => {
    expect(sourceTypeMeta('video').icon).toBe('Video')
    expect(sourceTypeMeta('presentation').icon).toBe('FileImage')
    expect(sourceTypeMeta('text').icon).toBe('FileText')
    expect(sourceTypeMeta('web').icon).toBe('Globe')
  })

  it('gives code its own word and icon (step Г c4 — closes the raw-token gap)', () => {
    expect(sourceTypeMeta('code')).toEqual({
      label: 'Код',
      icon: 'FileCode',
      color: 'text-ink-light',
    })
  })

  it('is total over the SourceType union — no value falls to the raw-token default', () => {
    for (const t of ALL_SOURCE_TYPES) {
      const m = sourceTypeMeta(t)
      expect(m.label).not.toBe(t) // a product word, never the raw token
      expect(m.icon).not.toBe('File') // a real icon, never the generic fallback
      expect(m.label).not.toMatch(/[A-Za-z]/) // ...and no Latin leak in the word
    }
  })

  it('falls back to generic File icon for unknown source_type', () => {
    expect(sourceTypeMeta('unknown')).toEqual({
      label: 'unknown',
      icon: 'File',
      color: 'text-ink-muted',
    })
  })
})
