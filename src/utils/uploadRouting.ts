import type { SourceType } from '../types/api'

/**
 * Single source of truth for upload routing (task 2.4.8).
 *
 * Both uploaders — the NodeDetailPanel drop-zone and the FlowContextMenu file
 * picker — route through these pure functions and accept strings instead of
 * duplicated inline logic, so the extension -> source_type map, the URL ->
 * video detect, and the three accept lists all derive from one canonical set.
 *
 * The whitelist mirrors the backend AUTHORED_POLICY.allowed_extensions
 * (course-supporter security/policies.py, 52 extensions as of
 * task-code-materials commit 3: 19 legacy + zip + 32 code extensions beyond
 * the html/htm overlap). The backend is canonical; the drift-guard in
 * uploadRouting.test.ts fails if these diverge from the documented backend set.
 */

// ── Canonical extension groups (mirror backend AUTHORED_POLICY) ──

/** Video container extensions -> source_type 'video' (backend _VIDEO_EXTENSIONS). */
export const VIDEO_EXTENSIONS: readonly string[] = ['mp4', 'mov', 'avi', 'mkv', 'webm']

const AUDIO_EXTENSIONS: readonly string[] = ['mp3', 'wav', 'm4a', 'ogg', 'flac']

const PRESENTATION_EXTENSIONS: readonly string[] = ['pdf', 'pptx', 'ppt']

// Documents handled locally by the backend TextProcessor -> source_type 'text'.
// html/htm and md/markdown are accepted aliases (re-added in task 2.4.8 B1).
// docx carries its own MIME family; the rest share text/*.
const DOCX_EXTENSIONS: readonly string[] = ['docx']
const TEXT_FAMILY_EXTENSIONS: readonly string[] = ['txt', 'md', 'markdown', 'html', 'htm']

// Source-code extensions -> source_type 'code' by DEFAULT routing (backend
// CODE_EXTENSIONS, task-code-materials R2). html/htm are deliberately ABSENT
// here: they default to 'text' (article reading) and the author opts a file
// into html-as-code explicitly via the upload dialog (defect-#9 axis), not by
// extension. The .zip project archive also routes to 'code' (R1).
export const CODE_ROUTED_EXTENSIONS: readonly string[] = [
  'py', 'ipynb', // Python
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', // JavaScript / TypeScript
  'java', 'kt', 'kts', // Java / Kotlin
  'cs', // C#
  'go', // Go
  'rs', // Rust
  'php', // PHP
  'rb', // Ruby
  'c', 'h', 'cpp', 'hpp', 'cc', // C / C++
  'swift', // Swift
  'dart', // Dart
  'css', 'scss', // styling companions
  'json', 'xml', 'yaml', 'yml', 'toml', 'sql', // data / config companions
  'sh', // shell
]

const ARCHIVE_EXTENSIONS: readonly string[] = ['zip']

// Text-family extensions the author may EXPLICITLY re-declare as code in the
// upload dialog (the ratified defect-#9 axis: html-as-code is author intent,
// not extension-derived). Mirrors the backend rule: source_type=code accepts
// only CODE_EXTENSIONS ∪ zip — of the text-routed family, only html/htm are
// in CODE_EXTENSIONS, so only they are re-declarable (a .md sent as code
// would 400 at the light-gate).
export const CODE_ELIGIBLE_TEXT_EXTENSIONS: readonly string[] = ['html', 'htm']

/** Full accepted-extension set (52) — the source for every accept string. */
export const ALL_UPLOAD_EXTENSIONS: readonly string[] = [
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...PRESENTATION_EXTENSIONS,
  ...DOCX_EXTENSIONS,
  ...TEXT_FAMILY_EXTENSIONS,
  ...CODE_ROUTED_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
]

const dotted = (ext: string): string => `.${ext}`

// ── Routing ──

/**
 * Map a lower-cased file extension (no leading dot) to its upload source_type.
 *
 * Everything outside the audio / video / presentation groups maps to `text`
 * (the backend TextProcessor handles md/markdown/docx/txt/html/htm). `web` is
 * reserved for the URL path only — a *file* never routes to `web` (an uploaded
 * .html is a local file for TextProcessor, not a URL to scrape). Unknown
 * extensions fall back to `text`; the backend AUTHORED_POLICY whitelist is the
 * real gate (Stage 1 rejects an illegal extension before any processor runs).
 */
export function sourceTypeForExtension(ext: string): SourceType {
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (PRESENTATION_EXTENSIONS.includes(ext)) return 'presentation'
  if (CODE_ROUTED_EXTENSIONS.includes(ext) || ARCHIVE_EXTENSIONS.includes(ext))
    return 'code'
  return 'text'
}

/**
 * True when a pasted URL should ingest as video (yt-dlp), not web scrape.
 *
 * Matches the youtube / vimeo hosts, or a direct video-file URL (any of the 5
 * video extensions) at the end of the path or immediately before a query
 * string. The `(\?|$)` anchor keeps `archive.mp4.zip` from matching while still
 * accepting `clip.mp4?t=5`.
 */
export function isVideoUrl(url: string): boolean {
  return /youtu\.?be|vimeo|\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(url)
}

// ── Accept lists (all derived from the canonical groups above) ──

/** Flat comma-joined accept attribute for a plain `<input type="file">`. */
export const UPLOAD_ACCEPT_ATTR: string = ALL_UPLOAD_EXTENSIONS.map(dotted).join(',')

/** MIME-keyed accept map for react-dropzone (`useDropzone({ accept })`). */
export const UPLOAD_DROPZONE_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    DOCX_EXTENSIONS.map(dotted),
  'video/*': VIDEO_EXTENSIONS.map(dotted),
  'audio/*': AUDIO_EXTENSIONS.map(dotted),
  // Code files mostly report text/* (or an empty MIME, matched by extension);
  // react-dropzone accepts a file when the extension matches ANY listed group.
  'text/*': [...TEXT_FAMILY_EXTENSIONS.map(dotted), ...CODE_ROUTED_EXTENSIONS.map(dotted)],
  'application/zip': ARCHIVE_EXTENSIONS.map(dotted),
  'application/json': ['.json', '.ipynb'],
}
