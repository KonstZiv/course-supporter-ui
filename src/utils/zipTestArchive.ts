// Test support: a ZIP archive written in memory, as the tests of `zipText` and
// `materialFeatures` need it — stored and deflated entries, and the unusual
// shapes the reader must turn down. Not used by the app.

export interface TestZipEntry {
  name: string
  text: string
  /** 0 — stored, 8 — deflated (the default); any other is written as is. */
  method?: number
  /** General-purpose flags; 1 — encrypted. */
  flags?: number
}

export interface TestZipOptions {
  /** Write 0xFFFF as the number of entries, as a ZIP64 archive does. */
  zip64Count?: boolean
}

const UTF8 = new TextEncoder()

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw')
  const writer = stream.writable.getWriter()
  void writer.write(data as Uint8Array<ArrayBuffer>).then(() => writer.close())
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/** The archive's bytes. */
export async function zipBytes(
  entries: TestZipEntry[],
  options: TestZipOptions = {},
): Promise<Uint8Array> {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const entry of entries) {
    const name = UTF8.encode(entry.name)
    const raw = UTF8.encode(entry.text)
    const method = entry.method ?? 8
    const data = method === 8 ? await deflateRaw(raw) : raw
    const flags = entry.flags ?? 0

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, flags, true)
    local.setUint16(8, method, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, raw.length, true)
    local.setUint16(26, name.length, true)
    parts.push(new Uint8Array(local.buffer), name, data)

    const head = new DataView(new ArrayBuffer(46))
    head.setUint32(0, 0x02014b50, true)
    head.setUint16(4, 20, true)
    head.setUint16(6, 20, true)
    head.setUint16(8, flags, true)
    head.setUint16(10, method, true)
    head.setUint32(20, data.length, true)
    head.setUint32(24, raw.length, true)
    head.setUint16(28, name.length, true)
    head.setUint32(42, offset, true)
    central.push(new Uint8Array(head.buffer), name)

    offset += 30 + name.length + data.length
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  const count = options.zip64Count ? 0xffff : entries.length
  end.setUint16(8, count, true)
  end.setUint16(10, count, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of all) {
    out.set(c, at)
    at += c.length
  }
  return out
}

/** The archive as a file. */
export async function zipFile(
  name: string,
  entries: TestZipEntry[],
  options: TestZipOptions = {},
): Promise<File> {
  return new File([(await zipBytes(entries, options)) as Uint8Array<ArrayBuffer>], name)
}
