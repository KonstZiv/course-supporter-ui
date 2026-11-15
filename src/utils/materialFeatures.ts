import type { MaterialEstimateKind, ProcessingEstimateRequest } from '../types/api'
import { docxTextChars, pptxFeatures } from './zipText'

// What the browser can read of a material before it is sent, for the price of
// its processing (`POST /nodes/{node_id}/documents/estimate`). Read here:
//
// * audio, video — the duration from the media element's metadata (the caller
//   has it already, from the pre-send checks);
// * txt, md, markdown — the length of the text;
// * html, htm — the length of the text the page shows (`DOMParser`);
// * docx — the text of the document's body; pptx — the slides and their text
//   (`zipText`).
//
// Not read: pdf, ppt, a media file without a readable duration. Their request
// carries the kind alone, and the price is "could not be counted before
// processing". Nothing here throws.

const PLAIN_TEXT = new Set(['txt', 'md', 'markdown'])
const HTML = new Set(['html', 'htm'])

function extOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function codePoints(text: string): number {
  return Array.from(text).length
}

async function textOf(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

async function textChars(file: File): Promise<number | null> {
  const ext = extOf(file.name)
  try {
    if (PLAIN_TEXT.has(ext)) return codePoints(await textOf(file))
    if (HTML.has(ext)) {
      const page = new DOMParser().parseFromString(await textOf(file), 'text/html')
      return codePoints(page.body?.textContent ?? '')
    }
    if (ext === 'docx') return await docxTextChars(file)
  } catch {
    return null
  }
  return null
}

/**
 * The estimate request of one file about to be sent as `kind`. `durationSec` is
 * the media duration the pre-send checks read (null when unread).
 */
export async function readMaterialFeatures(
  file: File,
  kind: MaterialEstimateKind,
  durationSec: number | null = null,
): Promise<ProcessingEstimateRequest> {
  switch (kind) {
    case 'audio':
    case 'video':
      return durationSec !== null && durationSec > 0
        ? { kind, duration_sec: durationSec }
        : { kind }
    case 'text': {
      const chars = await textChars(file)
      return chars === null ? { kind } : { kind, text_chars: chars }
    }
    case 'presentation': {
      if (extOf(file.name) !== 'pptx') return { kind }
      const found = await pptxFeatures(file)
      return found === null
        ? { kind }
        : { kind, slides: found.slides, text_chars: found.textChars }
    }
    default:
      // web is a link and code is not processed when it is sent: the kind alone.
      return { kind }
  }
}
