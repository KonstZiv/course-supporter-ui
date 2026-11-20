import { describe, expect, it } from 'vitest'
import { formatDays, formatReviews, formatUnits, formatWorks } from '../utils/units'
import { notOpenedCountLabel } from '../portal/rejectionReasons'
import { translate } from './translate'

// The plural forms moved from code into ICU messages: the same words for the
// same numbers as before the move. The expected values are what the code
// wrote before it (the hand-picked forms of `utils/units` and
// `portal/rejectionReasons`).

const NB = ' '

const BEFORE: Record<string, [number, string][]> = {
  formatUnits: [
    [0, '0 юнітів'],
    [1, '1 юніт'],
    [2, '2 юніти'],
    [5, '5 юнітів'],
    [11, '11 юнітів'],
    [21, '21 юніт'],
    [22, '22 юніти'],
    [25, '25 юнітів'],
    [1500, `1${NB}500 юнітів`],
  ],
  formatDays: [
    [0, '0 днів'],
    [1, '1 день'],
    [2, '2 дні'],
    [5, '5 днів'],
    [11, '11 днів'],
    [21, '21 день'],
    [22, '22 дні'],
    [25, '25 днів'],
    [1500, `1${NB}500 днів`],
  ],
  formatWorks: [
    [0, '0 робіт'],
    [1, '1 робота'],
    [2, '2 роботи'],
    [5, '5 робіт'],
    [11, '11 робіт'],
    [21, '21 робота'],
    [22, '22 роботи'],
    [25, '25 робіт'],
    [1500, `1${NB}500 робіт`],
  ],
  formatReviews: [
    [0, '0 перевірок'],
    [1, '1 перевірку'],
    [2, '2 перевірки'],
    [5, '5 перевірок'],
    [11, '11 перевірок'],
    [21, '21 перевірку'],
    [22, '22 перевірки'],
    [25, '25 перевірок'],
    [1500, `1${NB}500 перевірок`],
  ],
  notOpenedCountLabel: [
    [0, '0 файлів не прочитано'],
    [1, '1 файл не прочитано'],
    [2, '2 файли не прочитано'],
    [5, '5 файлів не прочитано'],
    [11, '11 файлів не прочитано'],
    [21, '21 файл не прочитано'],
    [22, '22 файли не прочитано'],
    [25, '25 файлів не прочитано'],
    [1500, '1500 файлів не прочитано'],
  ],

}

const NOW: Record<string, (n: number) => string> = {
  formatUnits: (n) => formatUnits('uk', n),
  formatDays: (n) => formatDays('uk', n),
  formatWorks: (n) => formatWorks('uk', n),
  formatReviews: (n) => formatReviews('uk', n),
  notOpenedCountLabel: (n) => notOpenedCountLabel('uk', n),
}

describe('plural forms in uk, as before the catalog', () => {
  describe.each(Object.keys(BEFORE))('%s', (name) => {
    it.each(BEFORE[name]!)('%i → %s', (n, text) => {
      expect(NOW[name]!(n)).toBe(text)
    })
  })

  // One question is "питання", more are "питання" too, but the sentence around
  // them agrees with one or with many: exactly one, not the plural category
  // "one" (21 questions read as many).
  it.each([
    [['3'], 'Без відповіді лишилось питання 3 — воно зарахується як неправильне.'],
    [['1', '4'], 'Без відповіді лишились питання 1, 4 — вони зарахуються як неправильні.'],
    [
      Array.from({ length: 21 }, (_, i) => String(i + 1)),
      `Без відповіді лишились питання ${Array.from({ length: 21 }, (_, i) => i + 1).join(', ')} — вони зарахуються як неправильні.`,
    ],
  ])('unanswered questions %j', (numbers, text) => {
    expect(
      translate('uk', 'portal.test.unanswered', {
        count: numbers.length,
        list: numbers.join(', '),
      }),
    ).toBe(text)
  })
})
