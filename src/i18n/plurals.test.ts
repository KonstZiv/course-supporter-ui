import { describe, expect, it } from 'vitest'
import { formatDays, formatReviews, formatUnits, formatWorks } from '../utils/units'
import { notOpenedCountLabel } from '../portal/rejectionReasons'
import { translate, translateRich } from './translate'

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

// The canvas counters said "{count} розділів" for any number; now the plural
// form agrees with the number, as the dashboard's counters do.
describe('canvas counters in uk', () => {
  const COUNTS: [number, string][] = [
    [1, 'one'],
    [2, 'few'],
    [5, 'many'],
    [11, 'many'],
    [21, 'one'],
    [22, 'few'],
  ]
  const FORMS = {
    'panel.flow.sectionNode.subsectionsCount': { one: 'підрозділ', few: 'підрозділи', many: 'підрозділів' },
    'panel.flow.courseRootNode.sectionsCount': { one: 'розділ', few: 'розділи', many: 'розділів' },
    'panel.flow.courseRootNode.documentsCount': { one: 'документ', few: 'документи', many: 'документів' },
  } as const

  describe.each(Object.entries(FORMS))('%s', (key, forms) => {
    it.each(COUNTS)('%i', (count, form) => {
      expect(translate('uk', key as keyof typeof FORMS, { count })).toBe(
        `${count} ${forms[form as keyof typeof forms]}`,
      )
    })
  })

  const FILES = { one: 'файл', few: 'файли', many: 'файлів' } as const

  it.each(COUNTS)('panel.flow.structure.filesCount %i', (count, form) => {
    expect(translate('uk', 'panel.flow.structure.filesCount', { count })).toBe(
      ` · ${count} ${FILES[form as keyof typeof FILES]}`,
    )
  })

  it.each(COUNTS)('panel.flow.manifest.totalFiles %i', (count, form) => {
    expect(
      translateRich<string>('uk', 'panel.flow.manifest.totalFiles', {
        count,
        strong: (chunks) => `[${chunks.join('')}]`,
      }).join(''),
    ).toBe(`[${count}] ${FILES[form as keyof typeof FILES]}`)
  })

  it.each(COUNTS)('panel.confirmRoles.removedLine %i', (count, form) => {
    expect(translate('uk', 'panel.confirmRoles.removedLine', { count })).toBe(
      `Система вилучила ${count} ${FILES[form as keyof typeof FILES]} (безпека або службові теки) — їх подано лише у структурі проєкту; повернути їх не можна.`,
    )
  })
})

describe('package validity plural forms', () => {
  it.each([
    [1, 'Діє 1 місяць від дня купівлі.'],
    [3, 'Діє 3 місяці від дня купівлі.'],
    [12, 'Діє 12 місяців від дня купівлі.'],
  ])('uk: %i months → %s', (months, text) => {
    expect(translate('uk', 'shared.packages.validity', { months })).toBe(text)
  })

  it.each([
    [1, 'Valid for 1 month from the day of purchase.'],
    [3, 'Valid for 3 months from the day of purchase.'],
    [12, 'Valid for 12 months from the day of purchase.'],
  ])('en: %i months → %s', (months, text) => {
    expect(translate('en', 'shared.packages.validity', { months })).toBe(text)
  })
})
