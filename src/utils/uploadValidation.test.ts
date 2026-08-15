import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateUploadFiles } from './uploadValidation'

function file(name: string, size = 16): File {
  const f = new File(['x'], name)
  Object.defineProperty(f, 'size', { value: size })
  return f
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

describe('validateUploadFiles — video mirrors (Е10)', () => {
  // jsdom decodes no media and has no object URLs. Fake both: a media element
  // that fires loadedmetadata (or error) with a chosen duration on ``src`` set.
  let reportDuration: number
  let fireError = false

  beforeEach(() => {
    reportDuration = 60
    fireError = false
    URL.createObjectURL = vi.fn(() => 'blob:fake')
    URL.revokeObjectURL = vi.fn()
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'video' || tag === 'audio') {
        Object.defineProperty(el, 'duration', {
          get: () => reportDuration,
          configurable: true,
        })
        Object.defineProperty(el, 'src', {
          set: () => {
            queueMicrotask(() =>
              el.dispatchEvent(new Event(fireError ? 'error' : 'loadedmetadata')),
            )
          },
          configurable: true,
        })
      }
      return el
    }) as typeof document.createElement)
  })
  afterEach(() => vi.restoreAllMocks())

  it('rejects a video over 1 GiB with the ratified text', async () => {
    const r = await validateUploadFiles([file('big.mp4', 1024 * 1024 * 1024 + 1)])
    expect(r.accepted).toEqual([])
    expect(r.rejectionMessage).toContain(
      'big.mp4: відео завелике для надсилання з браузера — до 1 ГБ',
    )
  })

  it('rejects a video over 150 minutes with the ratified text', async () => {
    reportDuration = 151 * 60
    const r = await validateUploadFiles([file('long.mp4', 10 * 1024 * 1024)])
    expect(r.accepted).toEqual([])
    expect(r.rejectionMessage).toContain(
      'Система зараз обробляє відео до 150 хвилин. Будь ласка, розділіть на коротші частини:',
    )
    expect(r.rejectionMessage).toContain('«long.mp4»')
  })

  it('accepts a normal-length video', async () => {
    reportDuration = 10 * 60
    const r = await validateUploadFiles([file('ok.mp4', 10 * 1024 * 1024)])
    expect(r.accepted.map((f) => f.name)).toEqual(['ok.mp4'])
    expect(r.rejectionMessage).toBeNull()
  })

  it('fails open when the metadata is unreadable (skip, not block)', async () => {
    fireError = true
    const r = await validateUploadFiles([file('weird.mkv', 10 * 1024 * 1024)])
    expect(r.accepted.map((f) => f.name)).toEqual(['weird.mkv'])
    expect(r.rejectionMessage).toBeNull()
  })
})
