import type { SourceType } from '../types/api'

/**
 * Single source of truth for upload routing (task 2.4.8).
 *
 * Both uploaders — the NodeDetailPanel drop-zone and the FlowContextMenu file
 * picker — route through these pure functions instead of duplicated inline
 * logic, so the extension -> source_type map and the URL -> video detect live
 * in one tested place. The whitelist mirrors the backend AUTHORED_POLICY
 * (security/policies.py); the backend is canonical.
 */

/**
 * Map a lower-cased file extension (no leading dot) to its upload source_type.
 *
 * Unknown extensions fall back to `text`; the backend AUTHORED_POLICY whitelist
 * is the real gate (an illegal extension is rejected at Stage 1 before any
 * processor runs), so the fallback is safe.
 */
export function sourceTypeForExtension(ext: string): SourceType {
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) return 'audio'
  if (['mp4', 'webm'].includes(ext)) return 'video'
  if (['pdf', 'pptx', 'ppt'].includes(ext)) return 'presentation'
  if (['html', 'htm'].includes(ext)) return 'web'
  return 'text'
}

/** True when a pasted URL should ingest as video (yt-dlp), not web scrape. */
export function isVideoUrl(url: string): boolean {
  return /youtu\.?be|vimeo|\.mp4/i.test(url)
}
