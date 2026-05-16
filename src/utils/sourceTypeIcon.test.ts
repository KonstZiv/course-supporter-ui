import { describe, it, expect } from 'vitest'
import { sourceTypeMeta } from './sourceTypeIcon'

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

  it('falls back to generic File icon for unknown source_type', () => {
    expect(sourceTypeMeta('unknown')).toEqual({
      label: 'unknown',
      icon: 'File',
      color: 'text-ink-muted',
    })
  })
})
