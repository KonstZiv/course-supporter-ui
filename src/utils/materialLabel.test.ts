import { describe, it, expect } from 'vitest'
import {
  deletedMaterialLabelFull,
  deletedMaterialLabelShort,
  deletedMaterialAuthorLine,
} from './materialLabel'

describe('deleted material label (ARC §7 Г3 / Р7)', () => {
  const AUG = '2026-08-08T12:00:00Z'

  it('full form — "Матеріал видалено автором <date>" (history)', () => {
    const out = deletedMaterialLabelFull(AUG)
    expect(out).toMatch(
      /^Матеріал видалено автором \d{1,2} \S+ \d{4}, \d{2}:\d{2}$/u,
    )
    expect(out).toContain('серпня')
  })

  it('short form — exactly "Матеріал видалено", no date (strip)', () => {
    expect(deletedMaterialLabelShort()).toBe('Матеріал видалено')
  })

  it('author line — "автором <date>", the history second line (Г9)', () => {
    const out = deletedMaterialAuthorLine(AUG)
    expect(out).toMatch(/^автором \d{1,2} \S+ \d{4}, \d{2}:\d{2}$/u)
    expect(out).toContain('серпня')
  })

  it('the two history lines join to the exact full verbatim — the Г9 split changes only layout', () => {
    // Г3 words are fixed; splitting the marker across two lines must not alter a
    // single character. The first line is the fact, the second the author + moment.
    expect(`${deletedMaterialLabelShort()} ${deletedMaterialAuthorLine(AUG)}`).toBe(
      deletedMaterialLabelFull(AUG),
    )
  })

  it('neither form carries a machine time format', () => {
    for (const out of [
      deletedMaterialLabelFull(AUG),
      deletedMaterialLabelShort(),
      deletedMaterialAuthorLine(AUG),
    ]) {
      expect(out).not.toMatch(/:\d{2}:\d{2}/) // seconds
      expect(out).not.toMatch(/\d{4}-\d{2}-\d{2}/) // dashed machine date
      expect(out).not.toMatch(/T\d{2}/) // ISO 'T'
    }
  })

  it('takes no name field — the scrubbed server marker has no path into the output', () => {
    // Locks Г3 by signature: full accepts only a timestamp, short accepts
    // nothing, so a live material's name (or the server scrub marker with its
    // machine time) cannot be threaded through either. Proven here by the marker
    // phrase never appearing whatever moment is passed.
    expect(deletedMaterialLabelFull(AUG)).not.toContain('інформація видалена')
    expect(deletedMaterialLabelShort()).not.toContain('інформація видалена')
  })
})
