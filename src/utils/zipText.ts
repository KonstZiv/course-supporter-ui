// The text of a Word document (.docx) and the slides of a PowerPoint
// presentation (.pptx), read in the browser before the file is sent, for the
// price of its processing. Both are ZIP archives of XML: the archive's central
// directory is read from the end of the file, and only the entries that hold
// the text are unpacked — a stored entry as it is, a deflated one through the
// browser's own `DecompressionStream('deflate-raw')`. No dependency.
//
// Anything unusual — ZIP64, encryption, another compression method, a broken
// structure, no `DecompressionStream`, a file over the limit — gives `null`:
// the price is then "could not be counted before processing". Nothing here
// throws.

/** Presentations are refused over 50 MB by the server; nothing larger is read. */
export const MAX_ZIP_BYTES = 50 * 1024 * 1024

/** An unpacked entry larger than this is not read (a guard against bombs). */
const MAX_ENTRY_BYTES = 64 * 1024 * 1024

const EOCD_SIGNATURE = 0x06054b50
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const EOCD_SIZE = 22
const MAX_COMMENT = 0xffff
const CENTRAL_HEADER_SIZE = 46
const LOCAL_HEADER_SIZE = 30
const METHOD_STORED = 0
const METHOD_DEFLATE = 8
const FLAG_ENCRYPTED = 0x1

export interface ZipEntry {
  name: string
  method: number
  flags: number
  compressedSize: number
  size: number
  localOffset: number
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }
  // Older engines (and some test DOMs) have only FileReader.
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

const UTF8 = new TextDecoder('utf-8')

function readable(blob: Blob): boolean {
  return blob.size > 0 && blob.size <= MAX_ZIP_BYTES
}

/** The entries of the archive's central directory; null when it is unusual. */
export async function readZipDirectory(blob: Blob): Promise<ZipEntry[] | null> {
  try {
    if (!readable(blob)) return null
    const tailStart = Math.max(0, blob.size - (EOCD_SIZE + MAX_COMMENT))
    const tail = await bytesOf(blob.slice(tailStart))
    const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)

    let eocd = -1
    for (let i = tail.length - EOCD_SIZE; i >= 0; i -= 1) {
      if (view.getUint32(i, true) === EOCD_SIGNATURE) {
        eocd = i
        break
      }
    }
    if (eocd < 0) return null
    // A ZIP64 archive puts its locator right before the record.
    if (eocd >= 20 && view.getUint32(eocd - 20, true) === ZIP64_LOCATOR_SIGNATURE) {
      return null
    }
    const disk = view.getUint16(eocd + 4, true)
    const entries = view.getUint16(eocd + 10, true)
    const size = view.getUint32(eocd + 12, true)
    const offset = view.getUint32(eocd + 16, true)
    if (disk !== 0 || entries === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
      return null
    }
    if (offset + size > blob.size) return null

    const central = await bytesOf(blob.slice(offset, offset + size))
    const dir = new DataView(central.buffer, central.byteOffset, central.byteLength)
    const found: ZipEntry[] = []
    let at = 0
    for (let n = 0; n < entries; n += 1) {
      if (at + CENTRAL_HEADER_SIZE > central.length) return null
      if (dir.getUint32(at, true) !== CENTRAL_SIGNATURE) return null
      const nameLength = dir.getUint16(at + 28, true)
      const extraLength = dir.getUint16(at + 30, true)
      const commentLength = dir.getUint16(at + 32, true)
      const entry: ZipEntry = {
        flags: dir.getUint16(at + 8, true),
        method: dir.getUint16(at + 10, true),
        compressedSize: dir.getUint32(at + 20, true),
        size: dir.getUint32(at + 24, true),
        localOffset: dir.getUint32(at + 42, true),
        name: UTF8.decode(
          central.subarray(at + CENTRAL_HEADER_SIZE, at + CENTRAL_HEADER_SIZE + nameLength),
        ),
      }
      if (
        entry.compressedSize === 0xffffffff ||
        entry.size === 0xffffffff ||
        entry.localOffset === 0xffffffff
      ) {
        return null
      }
      found.push(entry)
      at += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength
    }
    return found
  } catch {
    return null
  }
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  const stream = new DecompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  writer.closed.catch(() => {})
  writer
    .write(data as Uint8Array<ArrayBuffer>)
    .then(() => writer.close())
    .catch(() => {})
  const reader = stream.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_ENTRY_BYTES) {
      void reader.cancel().catch(() => {})
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

/** One entry's content as UTF-8 text; null when it cannot be read. */
export async function readZipEntryText(
  blob: Blob,
  entry: ZipEntry,
): Promise<string | null> {
  try {
    if ((entry.flags & FLAG_ENCRYPTED) !== 0) return null
    if (entry.method !== METHOD_STORED && entry.method !== METHOD_DEFLATE) return null
    if (entry.method === METHOD_DEFLATE && typeof DecompressionStream === 'undefined') {
      return null
    }
    if (entry.size > MAX_ENTRY_BYTES) return null

    const header = await bytesOf(
      blob.slice(entry.localOffset, entry.localOffset + LOCAL_HEADER_SIZE),
    )
    if (header.length < LOCAL_HEADER_SIZE) return null
    const local = new DataView(header.buffer, header.byteOffset, header.byteLength)
    if (local.getUint32(0, true) !== LOCAL_SIGNATURE) return null
    const start =
      entry.localOffset +
      LOCAL_HEADER_SIZE +
      local.getUint16(26, true) +
      local.getUint16(28, true)
    const end = start + entry.compressedSize
    if (end > blob.size) return null
    const raw = await bytesOf(blob.slice(start, end))
    const data = entry.method === METHOD_STORED ? raw : await inflateRaw(raw)
    return data === null ? null : UTF8.decode(data)
  } catch {
    return null
  }
}

const ENTITY: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const point =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(point) && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : whole
    }
    return ENTITY[code] ?? whole
  })
}

/**
 * The characters inside the text elements `<{tag}>` of an XML part
 * (`w:t` of Word, `a:t` of DrawingML), counted as code points.
 */
export function xmlTextChars(xml: string, tag: string): number {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`<${escaped}(?:\\s[^>]*)?>([^<]*)</${escaped}>`, 'g')
  let chars = 0
  for (const match of xml.matchAll(pattern)) {
    chars += Array.from(decodeXml(match[1] ?? '')).length
  }
  return chars
}

/** The characters of a .docx document's body; null when it cannot be read. */
export async function docxTextChars(file: Blob): Promise<number | null> {
  const entries = await readZipDirectory(file)
  const body = entries?.find((e) => e.name === 'word/document.xml')
  if (!body) return null
  const xml = await readZipEntryText(file, body)
  return xml === null ? null : xmlTextChars(xml, 'w:t')
}

const SLIDE_ENTRY = /^ppt\/slides\/slide\d+\.xml$/

export interface PresentationFeatures {
  slides: number
  textChars: number
}

/** The slides of a .pptx and the characters of their text; null when unread. */
export async function pptxFeatures(file: Blob): Promise<PresentationFeatures | null> {
  const entries = await readZipDirectory(file)
  if (!entries) return null
  const slides = entries.filter((e) => SLIDE_ENTRY.test(e.name))
  if (slides.length === 0) return null
  let textChars = 0
  for (const slide of slides) {
    const xml = await readZipEntryText(file, slide)
    if (xml === null) return null
    textChars += xmlTextChars(xml, 'a:t')
  }
  return { slides: slides.length, textChars }
}
