import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_ZIP_BYTES,
  docxTextChars,
  pptxFeatures,
  readZipDirectory,
  readZipEntryText,
  xmlTextChars,
} from './zipText'
import { zipBytes, zipFile } from './zipTestArchive'

const DOCX_BODY =
  '<w:document><w:body><w:p><w:r><w:t>Привіт, </w:t></w:r>' +
  '<w:r><w:t xml:space="preserve">світе &amp; Python</w:t></w:r><w:r><w:tab/></w:r>' +
  '<w:r><w:t/></w:r></w:p></w:body></w:document>'
// "Привіт, " (8) + "світе & Python" (14)
const DOCX_CHARS = 22

const slide = (text: string) =>
  `<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p>` +
  '</p:txBody></p:sp></p:spTree></p:cSld></p:sld>'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readZipDirectory / readZipEntryText', () => {
  it('reads a stored entry and a deflated one', async () => {
    const file = await zipFile('a.zip', [
      { name: 'stored.txt', text: 'як є', method: 0 },
      { name: 'packed.txt', text: 'стиснуто '.repeat(50), method: 8 },
    ])
    const entries = await readZipDirectory(file)
    expect(entries?.map((e) => [e.name, e.method])).toEqual([
      ['stored.txt', 0],
      ['packed.txt', 8],
    ])
    expect(await readZipEntryText(file, entries![0]!)).toBe('як є')
    expect(await readZipEntryText(file, entries![1]!)).toBe('стиснуто '.repeat(50))
  })
})

describe('xmlTextChars', () => {
  it('counts the text of the named elements only, entities decoded', () => {
    expect(xmlTextChars(DOCX_BODY, 'w:t')).toBe(DOCX_CHARS)
    expect(xmlTextChars('<a:t>&#1055;&#x456;</a:t><a:tab/>', 'a:t')).toBe(2)
  })
})

describe('docxTextChars', () => {
  it('the characters of the document body (deflated, as Word writes it)', async () => {
    const file = await zipFile('lesson.docx', [
      { name: '[Content_Types].xml', text: '<Types/>' },
      { name: 'word/document.xml', text: DOCX_BODY },
    ])
    expect(await docxTextChars(file)).toBe(DOCX_CHARS)
  })

  it('a stored body reads the same', async () => {
    const file = await zipFile('lesson.docx', [
      { name: 'word/document.xml', text: DOCX_BODY, method: 0 },
    ])
    expect(await docxTextChars(file)).toBe(DOCX_CHARS)
  })

  it('no body → null', async () => {
    const file = await zipFile('lesson.docx', [{ name: 'other.xml', text: '<x/>' }])
    expect(await docxTextChars(file)).toBeNull()
  })
})

describe('pptxFeatures', () => {
  it('the slides and the characters of their text', async () => {
    const file = await zipFile('deck.pptx', [
      { name: 'ppt/presentation.xml', text: '<p:presentation/>' },
      { name: 'ppt/slides/slide1.xml', text: slide('Вступ') },
      { name: 'ppt/slides/slide2.xml', text: slide('Цикли for'), method: 0 },
      { name: 'ppt/slides/_rels/slide1.xml.rels', text: '<Relationships/>' },
      { name: 'ppt/slideLayouts/slideLayout1.xml', text: slide('макет') },
    ])
    expect(await pptxFeatures(file)).toEqual({ slides: 2, textChars: 5 + 9 })
  })

  it('no slides → null', async () => {
    const file = await zipFile('deck.pptx', [{ name: 'ppt/presentation.xml', text: '<p/>' }])
    expect(await pptxFeatures(file)).toBeNull()
  })
})

describe('anything unusual → null, never an exception', () => {
  const deck = [{ name: 'ppt/slides/slide1.xml', text: slide('Текст') }]

  it('ZIP64', async () => {
    const file = await zipFile('deck.pptx', deck, { zip64Count: true })
    expect(await readZipDirectory(file)).toBeNull()
    expect(await pptxFeatures(file)).toBeNull()
  })

  it('an encrypted entry', async () => {
    const file = await zipFile('deck.pptx', [{ ...deck[0]!, flags: 1 }])
    expect(await pptxFeatures(file)).toBeNull()
  })

  it('another compression method', async () => {
    const file = await zipFile('lesson.docx', [
      { name: 'word/document.xml', text: DOCX_BODY, method: 12 },
    ])
    expect(await docxTextChars(file)).toBeNull()
  })

  it('not an archive at all', async () => {
    const file = new File(['це просто текст, а не архів'], 'lesson.docx')
    expect(await readZipDirectory(file)).toBeNull()
    expect(await docxTextChars(file)).toBeNull()
  })

  it('a broken central directory', async () => {
    const bytes = await zipBytes(deck)
    // The central record's signature, the first byte after the entry's data.
    const central = bytes.length - 22 - (46 + 'ppt/slides/slide1.xml'.length)
    bytes[central] = 0
    expect(await pptxFeatures(new File([bytes as Uint8Array<ArrayBuffer>], 'deck.pptx'))).toBeNull()
  })

  it('broken deflated data', async () => {
    const bytes = await zipBytes([{ name: 'word/document.xml', text: DOCX_BODY }])
    const start = 30 + 'word/document.xml'.length
    for (let i = start; i < start + 8; i += 1) bytes[i] = 0xff
    expect(await docxTextChars(new File([bytes as Uint8Array<ArrayBuffer>], 'a.docx'))).toBeNull()
  })

  it('no DecompressionStream in the browser', async () => {
    const file = await zipFile('lesson.docx', [{ name: 'word/document.xml', text: DOCX_BODY }])
    vi.stubGlobal('DecompressionStream', undefined)
    expect(await docxTextChars(file)).toBeNull()
  })

  it('a file over 50 MB is not read', async () => {
    const huge = { size: MAX_ZIP_BYTES + 1, slice: vi.fn() } as unknown as Blob
    expect(await readZipDirectory(huge)).toBeNull()
    expect(await docxTextChars(huge)).toBeNull()
    expect(huge.slice).not.toHaveBeenCalled()
  })
})
