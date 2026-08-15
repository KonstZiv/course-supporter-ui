import { describe, it, expect } from 'vitest'
import { validateUploadFiles } from './uploadValidation'

function file(name: string, size = 16): File {
  return new File([new Uint8Array(size)], name)
}

describe('validateUploadFiles (Е2 pre-send checks)', () => {
  it('accepts normal files with no rejection message', async () => {
    const r = await validateUploadFiles([file('notes.txt'), file('slides.pdf')])
    expect(r.accepted.map((f) => f.name)).toEqual(['notes.txt', 'slides.pdf'])
    expect(r.rejectionMessage).toBeNull()
  })

  it('rejects an oversized presentation but keeps the rest', async () => {
    const big = file('deck.pptx', 51 * 1024 * 1024)
    const r = await validateUploadFiles([big, file('ok.txt')])
    expect(r.accepted.map((f) => f.name)).toEqual(['ok.txt'])
    expect(r.rejectionMessage).toContain(
      'deck.pptx перевищує ліміт 50 МБ для презентацій',
    )
  })

  it('a presentation at the limit is accepted (boundary)', async () => {
    const r = await validateUploadFiles([file('deck.pdf', 50 * 1024 * 1024)])
    expect(r.accepted.map((f) => f.name)).toEqual(['deck.pdf'])
    expect(r.rejectionMessage).toBeNull()
  })
})
