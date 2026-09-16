import { describe, expect, it } from 'vitest'
import {
  formatFileSize,
  notOpenedCountLabel,
  notOpenedPhrase,
  rejectionPhrase,
  UNKNOWN_REASON,
} from './rejectionReasons'
import type { PortalNotOpened } from './types'

const rej = (code: string, details: string | null = 'work.zip') => ({ code, details })
const skipped = (path: string, reason: string): PortalNotOpened => ({
  path,
  reason,
  size: 100,
})

describe('rejectionPhrase — layer 1, the §4 article for a whole submission', () => {
  it.each([
    ['forbidden_type', /Цей формат файла не приймається\./],
    ['charset_violation', /Кодування файла не розпізнано/],
    ['size_limit', /більший за дозволений розмір/],
    ['over_budget', /Робота завелика для перевірки/],
    ['empty_document', /немає тексту для перевірки/],
    ['suspicious_unicode', /приховані або підмінені символи/],
    ['prompt_injection', /інструкції, адресовані системі перевірки/],
  ])('%s → its ratified phrase', (code, re) => {
    expect(rejectionPhrase(rej(code))).toMatch(re)
  })

  it('names what happened AND what to do, in that order', () => {
    expect(rejectionPhrase(rej('empty_document'))).toBe(
      'У поданому файлі немає тексту для перевірки. ' +
        'Надішліть текстову версію роботи (не скан і не порожній архів).',
    )
  })

  it.each(['archive_violation', 'archive_bomb', 'symlink_violation'])(
    '%s → the one structural answer (which guard tripped is not the student’s concern)',
    (code) => {
      expect(rejectionPhrase(rej(code))).toMatch(/не пройшов перевірку структури/)
    },
  )
})

describe('rejectionPhrase — declines, so the caller can fall to the state layer', () => {
  // ``mismatch`` still declines: the phrase for its state says more than any
  // article keyed on the code could, and that wording is ratified.
  it('mismatch → null', () => {
    expect(rejectionPhrase(rej('mismatch'))).toBeNull()
  })

  // ``stage2_rejected`` no longer declines (mentor-rebuild task 03). Its
  // sentence used to live in the status layer; with that layer gone the article
  // carries it, so the safety refusal keeps the words it was ratified with
  // instead of falling to the generic phrase for "not opened".
  it('stage2_rejected → the ratified safety sentence', () => {
    expect(rejectionPhrase(rej('stage2_rejected'))).toMatch(
      /не пройшло перевірку безпеки/,
    )
  })

  it('a code this interface has never seen → null', () => {
    expect(rejectionPhrase(rej('some_future_code'))).toBeNull()
  })

  it('never returns the backend detail, whatever it holds', () => {
    const phrase = rejectionPhrase({
      code: 'some_future_code',
      details: "File extension '.exe' is not accepted.",
    })
    expect(phrase).toBeNull()
  })
})

describe('rejectionPhrase — the two sizes behind over_budget', () => {
  // Stage 1 refuses one oversize file and puts the FILENAME in details; the
  // project branch refuses an assembled context and puts the two NUMBERS
  // there. One code, two answers, and the discriminator is the shape of
  // details — a filename can never parse as a pair of numbers.
  it('a pair of numbers → the project sentence, grouped for uk', () => {
    const phrase = rejectionPhrase(rej('over_budget', '295 000 / 131 072'))
    expect(phrase).toBe(
      `Проєкт завеликий для перевірки: 295\u00A0000 знаків тексту після ` +
        `очищення проти межі 131\u00A0072. ` +
        'До перевірки йдуть лише результати вашої роботи. Приберіть з архіву ' +
        'автоматично створені файли, сторонні бібліотеки, теки залежностей і ' +
        'кешів, великі дані та бінарні файли — і надішліть знову.',
    )
  })

  it('groups thousands itself rather than echoing the server spacing', () => {
    // The server sends plain spaces; the portal re-groups with the
    // non-breaking space uk uses, so the number never wraps mid-way.
    const phrase = rejectionPhrase(rej('over_budget', '1000000/2000000'))
    expect(phrase).toContain('1\u00A0000\u00A0000 знаків')
    expect(phrase).toContain('межі 2\u00A0000\u00A0000.')
  })

  it.each([null, '', ' / ', 'GATE-4.md', 'work.zip', '131072'])(
    'details %p → the plain phrase, no invented numbers',
    (details) => {
      const phrase = rejectionPhrase(rej('over_budget', details))
      expect(phrase).toBe(
        'Робота завелика для перевірки. ' +
          'Лишіть у роботі лише потрібне і подайте знову.',
      )
    },
  )
})

describe('rejectionPhrase — the gzip discrimination', () => {
  // Sound, not a guess: the backend answers a VALID gzip whose payload is not a
  // tar with magic_mismatch, and BROKEN gzip framing with archive_violation. So
  // magic_mismatch on a .gz/.tgz is the single-file case, always.
  it.each(['work.py.gz', 'WORK.TGZ', 'archive.tgz'])(
    '%s → "not a project archive, a single compressed file"',
    (name) => {
      expect(rejectionPhrase(rej('magic_mismatch', name))).toBe(
        'Це не архів проєкту, а стиснений одиночний файл. ' +
          'Запакуйте роботу як .zip або .tar.gz.',
      )
    },
  )

  it.each(['work.zip', 'solution.py', 'report.docx'])(
    '%s → the ordinary extension/content phrase',
    (name) => {
      expect(rejectionPhrase(rej('magic_mismatch', name))).toMatch(
        /не відповідає його розширенню/,
      )
    },
  )

  it('a null detail cannot crash the suffix test', () => {
    expect(rejectionPhrase(rej('magic_mismatch', null))).toMatch(
      /не відповідає його розширенню/,
    )
  })
})

describe('notOpenedPhrase — one file inside an archive', () => {
  it.each([
    ['charset_violation', 'Кодування не розпізнано.'],
    ['nested_archive', 'Архів усередині архіву.'],
    ['over_budget', 'Завеликий для перевірки.'],
  ])('%s → its own line', (reason, phrase) => {
    expect(notOpenedPhrase(skipped('a.txt', reason))).toBe(phrase)
  })

  // Step Г2 §2.4: the block heading says "not read" once; no line repeats it.
  // Asserted over EVERY branch of the function rather than the three that used
  // to carry the prefix — the asymmetry existed because the branches were
  // written apart, and a per-branch check is what keeps them together.
  it.each([
    ['a.txt', 'charset_violation'],
    ['a.txt', 'nested_archive'],
    ['a.txt', 'over_budget'],
    ['a.py', 'magic_mismatch'],
    ['shot.png', 'forbidden_type'],
    ['Makefile', 'forbidden_type'],
    ['.gitignore', 'forbidden_type'],
    ['docs/report.docx', 'forbidden_type'],
    ['a.py', 'reason_from_the_future'],
  ])('%s / %s does not repeat the heading', (path, reason) => {
    expect(notOpenedPhrase(skipped(path, reason))).not.toMatch(/не прочитано/i)
  })

  it('a document carries the action — it CAN be submitted on its own', () => {
    expect(notOpenedPhrase(skipped('docs/report.docx', 'forbidden_type'))).toBe(
      'Документи всередині архіву не читаються. Надішліть його окремим файлом.',
    )
    expect(notOpenedPhrase(skipped('paper.PDF', 'forbidden_type'))).toMatch(
      /окремим файлом/,
    )
  })

  it.each(['Makefile', 'src/Makefile', 'LICENSE'])(
    '%s → "no extension" (the NAME is checked, not the path)',
    (path) => {
      expect(notOpenedPhrase(skipped(path, 'forbidden_type'))).toBe(
        'Файл без розширення.',
      )
    },
  )

  it('a dotfile has an extension — it is simply not an accepted one', () => {
    expect(notOpenedPhrase(skipped('.gitignore', 'forbidden_type'))).toBe(
      'Формат не підтримується.',
    )
  })

  it('an ordinary unaccepted format gets no action — there is none to give', () => {
    expect(notOpenedPhrase(skipped('shot.png', 'forbidden_type'))).toBe(
      'Формат не підтримується.',
    )
  })

  it('magic_mismatch reuses the whole-file article, which reads either way', () => {
    expect(notOpenedPhrase(skipped('a.py', 'magic_mismatch'))).toMatch(
      /не відповідає його розширенню/,
    )
  })

  it('is TOTAL — an unknown reason still yields a line, never undefined', () => {
    expect(notOpenedPhrase(skipped('a.py', 'reason_from_the_future'))).toBe(
      'Причину не вказано.',
    )
  })
})

describe('formatFileSize', () => {
  it.each([
    [0, '0 Б'],
    [26, '26 Б'],
    [1023, '1023 Б'],
    [1024, '1,0 КБ'],
    [136_000, '133 КБ'],
    [5 * 1024 * 1024, '5,0 МБ'],
    [42 * 1024 * 1024, '42 МБ'],
  ])('%i → %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })
})

describe('UNKNOWN_REASON', () => {
  it('is the ratified last resort, both halves', () => {
    expect(UNKNOWN_REASON.what).toBe('Під час обробки подачі сталася помилка.')
    expect(UNKNOWN_REASON.action).toBe('Спробуйте подати ще раз.')
  })
})

describe('notOpenedCountLabel', () => {
  it.each([
    [1, '1 файл не прочитано'],
    [2, '2 файли не прочитано'],
    [4, '4 файли не прочитано'],
    [5, '5 файлів не прочитано'],
    [11, '11 файлів не прочитано'],
    [12, '12 файлів не прочитано'],
    [14, '14 файлів не прочитано'],
    [21, '21 файл не прочитано'],
    [22, '22 файли не прочитано'],
    [25, '25 файлів не прочитано'],
    [101, '101 файл не прочитано'],
    [111, '111 файлів не прочитано'],
  ])('%i → %s', (n, expected) => {
    expect(notOpenedCountLabel(n)).toBe(expected)
  })
})
