import { describe, expect, it } from 'vitest'
import { readMaterialFeatures } from './materialFeatures'
import { zipFile } from './zipTestArchive'

const file = (name: string, text: string) => new File([text], name)

describe('readMaterialFeatures', () => {
  it('audio and video: the duration the pre-send checks read', async () => {
    expect(await readMaterialFeatures(file('a.mp3', ''), 'audio', 312.5)).toEqual({
      kind: 'audio',
      duration_sec: 312.5,
    })
    expect(await readMaterialFeatures(file('v.mp4', ''), 'video', 60)).toEqual({
      kind: 'video',
      duration_sec: 60,
    })
  })

  it('a media file without a readable duration (avi, mkv): the kind alone', async () => {
    expect(await readMaterialFeatures(file('v.mkv', ''), 'video', null)).toEqual({
      kind: 'video',
    })
  })

  it('txt, md, markdown: the length of the text, in characters', async () => {
    expect(await readMaterialFeatures(file('a.txt', 'Привіт'), 'text')).toEqual({
      kind: 'text',
      text_chars: 6,
    })
    expect(await readMaterialFeatures(file('a.md', '# Цикли\n'), 'text')).toEqual({
      kind: 'text',
      text_chars: 8,
    })
  })

  it('html: the text the page shows, not its tags', async () => {
    const page = '<html><head><title>T</title></head><body><h1>Цикли</h1><p>for і while</p></body></html>'
    expect(await readMaterialFeatures(file('a.html', page), 'text')).toEqual({
      kind: 'text',
      text_chars: 'Циклиfor і while'.length,
    })
  })

  it('docx: the text of the body', async () => {
    const doc = await zipFile('a.docx', [
      { name: 'word/document.xml', text: '<w:t>Змінні</w:t>' },
    ])
    expect(await readMaterialFeatures(doc, 'text')).toEqual({ kind: 'text', text_chars: 6 })
  })

  it('pptx: the slides and their text', async () => {
    const deck = await zipFile('a.pptx', [
      { name: 'ppt/slides/slide1.xml', text: '<a:t>Один</a:t>' },
      { name: 'ppt/slides/slide2.xml', text: '<a:t>Два</a:t>' },
    ])
    expect(await readMaterialFeatures(deck, 'presentation')).toEqual({
      kind: 'presentation',
      slides: 2,
      text_chars: 7,
    })
  })

  it('pdf and ppt: the kind alone', async () => {
    expect(await readMaterialFeatures(file('a.pdf', '%PDF-1.7'), 'presentation')).toEqual({
      kind: 'presentation',
    })
    expect(await readMaterialFeatures(file('a.ppt', 'x'), 'presentation')).toEqual({
      kind: 'presentation',
    })
  })

  it('an unreadable docx: the kind alone', async () => {
    expect(await readMaterialFeatures(file('a.docx', 'не архів'), 'text')).toEqual({
      kind: 'text',
    })
  })
})
