import { describe, expect, it } from 'vitest'
import { youtubeEmbedUrl } from './youtube'

describe('youtubeEmbedUrl', () => {
  it('converts a watch?v= URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts a youtu.be short URL', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('carries a numeric ?t= timecode as ?start=', () => {
    expect(youtubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=90')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90',
    )
  })

  it('parses a 1m30s timecode', () => {
    expect(
      youtubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s'),
    ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?start=90')
  })

  it('passes through an already-embed URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('returns null for a non-YouTube URL (→ link-out fallback)', () => {
    expect(youtubeEmbedUrl('https://example.com/video')).toBeNull()
  })

  it('returns null for a malformed string', () => {
    expect(youtubeEmbedUrl('not a url')).toBeNull()
  })

  it('returns null for a YouTube URL without a valid 11-char id', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=short')).toBeNull()
  })
})
