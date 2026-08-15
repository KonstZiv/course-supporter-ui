import { formatAudioDuration } from '../components/ui/uploadConfirmMeta'
import { VIDEO_EXTENSIONS } from './uploadRouting'

// Client-side pre-send mirrors of the backend author policy, shared by both
// file surfaces (Е2). A fast courtesy only — the server's synchronous rejection
// stays the guarantee (Е8/Е10). Numbers mirror ``security/policies.py`` /
// ``config.py`` at BE ``75feeab`` (2026-08-15); a drift here would promise the
// author a limit the server does not hold (the class named by DD-AV-K).

/** Mirrors ``AUTHORED_POLICY.max_presentation_size_bytes`` (50 MB). */
const MAX_PRESENTATION_SIZE_BYTES = 50 * 1024 * 1024

/** Mirrors ``AUTHORED_POLICY.max_video_upload_bytes`` (1 GiB, the browser cap). */
const MAX_VIDEO_UPLOAD_BYTES = 1024 * 1024 * 1024

/** Mirrors ``settings.max_media_duration_sec`` (150 min) — audio and video. */
export const MAX_MEDIA_DURATION_SEC = 150 * 60

const PRESENTATION_EXTENSIONS = new Set(['pdf', 'pptx', 'ppt'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac'])

function extOf(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function isAudioFile(file: File): boolean {
  return AUDIO_EXTENSIONS.has(extOf(file))
}

// Reads media duration via a hidden HTMLMediaElement's loadedmetadata event.
// Returns seconds, or null when the browser cannot determine it (VBR / damaged
// headers → Infinity / NaN / error, or an unreadable container). Null is the
// fail-open signal: the file proceeds and the server's synchronous check is the
// guarantee.
export function readMediaDuration(
  file: File,
  kind: 'audio' | 'video',
): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(kind)
    el.preload = 'metadata'
    let settled = false
    const cleanup = () => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      el.removeEventListener('loadedmetadata', onLoad)
      el.removeEventListener('error', onError)
      clearTimeout(timer)
    }
    const onLoad = () => {
      const d = el.duration
      cleanup()
      resolve(Number.isFinite(d) && d > 0 ? d : null)
    }
    const onError = () => {
      cleanup()
      resolve(null)
    }
    // Safety timeout for browsers that fire neither event on bad media.
    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, 5000)
    el.addEventListener('loadedmetadata', onLoad)
    el.addEventListener('error', onError)
    el.src = url
  })
}

/** Audio duration preview for the confirm dialog (kept for call-site clarity). */
export function readAudioDuration(file: File): Promise<number | null> {
  return readMediaDuration(file, 'audio')
}

export interface UploadValidationResult {
  accepted: File[]
  /** Duration (s) keyed by file name; null when unread. Feeds the confirm dialog. */
  durations: Map<string, number | null>
  /** Composed product-language rejection text, or null when nothing was rejected. */
  rejectionMessage: string | null
}

/**
 * Pre-send checks run before the confirm dialog opens (Е2): presentation size
 * and audio duration today, video size/duration in Е10. Rejected files are left
 * out of ``accepted`` and named in ``rejectionMessage``; the caller shows it in
 * the browser modal (DD-2.2-AG).
 */
export async function validateUploadFiles(
  files: File[],
): Promise<UploadValidationResult> {
  const accepted: File[] = []
  const durations = new Map<string, number | null>()
  const oversized: string[] = []
  const tooBigVideo: string[] = []
  const tooLongAudio: string[] = []
  const tooLongVideo: string[] = []

  for (const file of files) {
    const ext = extOf(file)
    if (
      PRESENTATION_EXTENSIONS.has(ext) &&
      file.size > MAX_PRESENTATION_SIZE_BYTES
    ) {
      oversized.push(`${file.name} перевищує ліміт 50 МБ для презентацій`)
      continue
    }
    if (VIDEO_EXTENSIONS.includes(ext)) {
      // Е10 — size first (no byte flies for an over-limit video), then duration.
      if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
        tooBigVideo.push(
          `${file.name}: відео завелике для надсилання з браузера — до 1 ГБ`,
        )
        continue
      }
      const duration = await readMediaDuration(file, 'video')
      durations.set(file.name, duration)
      if (duration !== null && duration > MAX_MEDIA_DURATION_SEC) {
        tooLongVideo.push(`«${file.name}» — ${formatAudioDuration(duration)}`)
        continue
      }
      accepted.push(file)
      continue
    }
    if (isAudioFile(file)) {
      const duration = await readMediaDuration(file, 'audio')
      durations.set(file.name, duration)
      if (duration !== null && duration > MAX_MEDIA_DURATION_SEC) {
        tooLongAudio.push(`«${file.name}» — ${formatAudioDuration(duration)}`)
        continue
      }
    }
    accepted.push(file)
  }

  const blocks: string[] = []
  if (oversized.length > 0) blocks.push(oversized.join('\n'))
  if (tooBigVideo.length > 0) blocks.push(tooBigVideo.join('\n'))
  if (tooLongAudio.length > 0) {
    blocks.push(
      'Система зараз обробляє аудіо до 150 хвилин. ' +
        'Будь ласка, розділіть на коротші частини:\n\n' +
        tooLongAudio.join('\n'),
    )
  }
  if (tooLongVideo.length > 0) {
    blocks.push(
      'Система зараз обробляє відео до 150 хвилин. ' +
        'Будь ласка, розділіть на коротші частини:\n\n' +
        tooLongVideo.join('\n'),
    )
  }

  return {
    accepted,
    durations,
    rejectionMessage: blocks.length > 0 ? blocks.join('\n\n') : null,
  }
}
