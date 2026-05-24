import { describe, it, expect } from 'vitest'
import {
  sourceTypeForExtension,
  isVideoUrl,
  VIDEO_EXTENSIONS,
  ALL_UPLOAD_EXTENSIONS,
} from './uploadRouting'

// Human drift-guard: a mirror of the backend AUTHORED_POLICY.allowed_extensions
// (course-supporter security/policies.py — 19 extensions as of task 2.4.8 B1).
// The backend does not serialize the whitelist over the API, so this is a
// hand-maintained anchor: update BOTH this constant and policies.py together.
// The two assertions at the bottom fail loudly if the UI set drifts.
const BACKEND_VIDEO = ['mp4', 'mov', 'avi', 'mkv', 'webm']
const BACKEND_ALL = [
  'mp4', 'mov', 'avi', 'mkv', 'webm', // video (5)
  'mp3', 'wav', 'm4a', 'ogg', 'flac', // audio (5)
  'pdf', 'pptx', 'ppt', // presentation (3)
  'docx', 'txt', 'md', 'markdown', 'html', 'htm', // documents via TextProcessor (6)
]

describe('sourceTypeForExtension', () => {
  it('maps all 5 video extensions to video (mov/avi/mkv are NOT text)', () => {
    for (const ext of ['mp4', 'mov', 'avi', 'mkv', 'webm']) {
      expect(sourceTypeForExtension(ext)).toBe('video')
    }
  })

  it('maps all 5 audio extensions to audio', () => {
    for (const ext of ['mp3', 'wav', 'm4a', 'ogg', 'flac']) {
      expect(sourceTypeForExtension(ext)).toBe('audio')
    }
  })

  it('maps presentation extensions to presentation', () => {
    for (const ext of ['pdf', 'pptx', 'ppt']) {
      expect(sourceTypeForExtension(ext)).toBe('presentation')
    }
  })

  it('maps document extensions to text (incl. docx + markdown)', () => {
    for (const ext of ['md', 'markdown', 'docx', 'txt']) {
      expect(sourceTypeForExtension(ext)).toBe('text')
    }
  })

  it('maps an uploaded html/htm FILE to text, not web (task 2.4.8 inversion)', () => {
    expect(sourceTypeForExtension('html')).toBe('text')
    expect(sourceTypeForExtension('htm')).toBe('text')
  })

  it('falls back to text for unknown extensions', () => {
    expect(sourceTypeForExtension('xyz')).toBe('text')
    expect(sourceTypeForExtension('')).toBe('text')
  })

  it('never returns web for any accepted file extension (web is URL-only)', () => {
    for (const ext of ALL_UPLOAD_EXTENSIONS) {
      expect(sourceTypeForExtension(ext)).not.toBe('web')
    }
  })
})

describe('isVideoUrl', () => {
  it('detects youtube / youtu.be / vimeo hosts', () => {
    expect(isVideoUrl('https://youtu.be/abc123')).toBe(true)
    expect(isVideoUrl('https://www.youtube.com/watch?v=abc123')).toBe(true)
    expect(isVideoUrl('https://vimeo.com/123456')).toBe(true)
  })

  it('detects direct URLs for all 5 video extensions', () => {
    for (const ext of VIDEO_EXTENSIONS) {
      expect(isVideoUrl(`https://cdn.example.com/lecture.${ext}`)).toBe(true)
    }
  })

  it('accepts a direct video URL with a query string', () => {
    expect(isVideoUrl('https://cdn.example.com/clip.mp4?t=5')).toBe(true)
  })

  it('does not match a non-video file whose name merely contains .mp4', () => {
    expect(isVideoUrl('https://example.com/archive.mp4.zip')).toBe(false)
  })

  it('returns false for an ordinary web URL (incl. an .html page)', () => {
    expect(isVideoUrl('https://example.com/article')).toBe(false)
    expect(isVideoUrl('https://docs.example.com/guide.html')).toBe(false)
  })
})

describe('whitelist drift-guard (mirrors backend AUTHORED_POLICY)', () => {
  it('VIDEO_EXTENSIONS matches the backend _VIDEO_EXTENSIONS set', () => {
    expect([...VIDEO_EXTENSIONS].sort()).toEqual([...BACKEND_VIDEO].sort())
  })

  it('ALL_UPLOAD_EXTENSIONS matches the backend allowed_extensions (19)', () => {
    expect([...ALL_UPLOAD_EXTENSIONS].sort()).toEqual([...BACKEND_ALL].sort())
    expect(ALL_UPLOAD_EXTENSIONS).toHaveLength(19)
  })
})
