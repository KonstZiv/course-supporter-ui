import { describe, expect, it } from 'vitest'
import {
  STRUCTURE_BLOCK_ACTION,
  detailIsShowable,
  notReadCountLabel,
  structureReasonPhrase,
} from './codeStructureReasons'
import { notOpenedCountLabel } from '../portal/rejectionReasons'

// The twelve members of the backend's CodeStructureReason, verbatim. Written
// out rather than imported (the enum lives in Python): if the server grows a
// thirteenth, this list is the place it has to be added, and the test below
// is what makes that a build failure rather than a blank line on the card.
const TOKENS = [
  'denylist_dir',
  'denylist_file',
  'non_code_type',
  'magic_mismatch',
  'nested_archive',
  'vendored_dir',
  'lockfile',
  'generated_artifact',
  'oversize',
  'build_config',
  'author_structure_only',
  'charset_violation',
]

describe('structureReasonPhrase', () => {
  it.each(TOKENS)('%s has a phrase of its own', (token) => {
    const phrase = structureReasonPhrase(token)
    expect(phrase).not.toBe('Причину не вказано.')
    expect(phrase).not.toContain(token) // a product sentence, never the token
  })

  it('every phrase is distinct — two reasons never read the same', () => {
    const phrases = TOKENS.map(structureReasonPhrase)
    expect(new Set(phrases).size).toBe(TOKENS.length)
  })

  it('carries no action — the block carries one for all of them', () => {
    // A per-row instruction under a `.DS_Store` would be invented noise.
    for (const token of TOKENS) {
      expect(structureReasonPhrase(token)).not.toMatch(/залийте|виправте/i)
    }
  })

  it('names no internal role vocabulary', () => {
    // "structure_only" is the machine name of a role; the author chose
    // something on a screen, not a token.
    for (const token of TOKENS) {
      expect(structureReasonPhrase(token)).not.toMatch(/структур\w*_only|structure/i)
    }
  })

  it('a token from a future backend still yields a line', () => {
    expect(structureReasonPhrase('reason_from_the_future')).toBe(
      'Причину не вказано.',
    )
  })

  it('the block action tells the author what to do, once', () => {
    expect(STRUCTURE_BLOCK_ACTION).toMatch(/залийте знову/)
  })
})

describe('detailIsShowable', () => {
  it('hides the oversize detail — it is an internal English sentence', () => {
    // The server stores "file size 6291456 B exceeds the 4194304 B per-file
    // cap" there. The size is already in the phrase, so nothing is lost.
    expect(detailIsShowable('oversize')).toBe(false)
  })

  it.each(TOKENS.filter((t) => t !== 'oversize'))(
    '%s may show its detail — it is a path, a name or a pattern',
    (token) => {
      expect(detailIsShowable(token)).toBe(true)
    },
  )
})

describe('notReadCountLabel', () => {
  it.each([
    [1, '1 файл не прочитано'],
    [2, '2 файли не прочитано'],
    [3, '3 файли не прочитано'],
    [4, '4 файли не прочитано'],
    [5, '5 файлів не прочитано'],
    [10, '10 файлів не прочитано'],
    // The teens are the trap: 11 takes the plural 5 does, not the singular 1.
    [11, '11 файлів не прочитано'],
    [12, '12 файлів не прочитано'],
    [13, '13 файлів не прочитано'],
    [14, '14 файлів не прочитано'],
    [21, '21 файл не прочитано'],
    [22, '22 файли не прочитано'],
    [25, '25 файлів не прочитано'],
    [101, '101 файл не прочитано'],
    [111, '111 файлів не прочитано'],
    [201, '201 файл не прочитано'],
  ])('%i → «%s»', (n, expected) => {
    expect(notReadCountLabel(n)).toBe(expected)
  })

  it('agrees with the portal twin it was copied from', () => {
    // Two bundles, one rule. If either is edited alone this fails, which is
    // the only guard the boundary between them allows.
    for (const n of [1, 2, 4, 5, 11, 14, 21, 22, 101, 201]) {
      expect(notReadCountLabel(n)).toBe(notOpenedCountLabel(n))
    }
  })
})
