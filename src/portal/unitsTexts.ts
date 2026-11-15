// What the portal says about units around a student's work (BIL-E, stage 2b):
// the price before a submission, the panel when units are short, the
// reminders of "Мої курси" and "Юніти", and the note of a review that cost
// more than its reserve. A pure module — the words and nothing else — so
// every sentence is checked as written, and the language rules with it.

import { formatDate, formatReviews, formatUnits } from '../utils/units'

// ── Before a submission ───────────────────────────────────────────────

/** The author pays: who pays, and nothing about how much. */
export const PAID_BY_AUTHOR = 'Перевірку цієї роботи оплачує автор курсу.'

export const COUNTING = 'Рахуємо орієнтовну вартість…'

export const PRICE_UNAVAILABLE = 'Точну вартість зараз порахувати не вдалося.'

export const FREE_REVIEW = 'Ця перевірка не списує юнітів.'

export const UNITS_NOW_ENOUGH = 'Юнітів тепер вистачає.'

export const BUY_UNITS = 'Купити юніти'

export const FILE_WAITS_HERE =
  'Обраний файл лишається тут: після купівлі поверніться на цю вкладку.'

/** basis "ceiling", enough: the most the review can cost, then what is available. */
export function ceilingEnough(price: number, available: number): string {
  return (
    `${PRICE_UNAVAILABLE} Перевірка коштуватиме не більше ${formatUnits(price)}. ` +
    `У вас доступно ${formatUnits(available)}.`
  )
}

/** basis "ceiling", not enough: the threshold is not the ceiling, so "ще". */
export function ceilingShort(price: number, available: number, missing: number): string {
  return (
    `${PRICE_UNAVAILABLE} Перевірка коштуватиме не більше ${formatUnits(price)}, ` +
    `у вас ${formatUnits(available)}. Щоб подати роботу, потрібно ще ${formatUnits(missing)}.`
  )
}

/** A price known (typical or for the file), enough. */
export function pricedEnough(price: number, available: number): string {
  return (
    `Перевірка цього завдання коштує приблизно ${formatUnits(price)}. ` +
    `У вас доступно ${formatUnits(available)}.`
  )
}

/** A price known, not enough. */
export function pricedShort(price: number, available: number, missing: number): string {
  return (
    `Перевірка коштує приблизно ${formatUnits(price)}, у вас ${formatUnits(available)}. ` +
    `Не вистачає ${formatUnits(missing)}.`
  )
}

/** A test, with nothing left of a package. */
export const TEST_NEEDS_PACKAGE =
  'Тести перевіряються без списання юнітів, поки у вас є залишок пакета. ' +
  'Зараз залишку немає — щоб подати тест, купіть пакет.'

// ── "Мої курси" and "Юніти" ───────────────────────────────────────────

/** "Юніти", under what is available. */
export function reviewsLeftLine(reviewsLeft: number): string {
  return `Вистачить приблизно на ${formatReviews(reviewsLeft)}.`
}

/** "Мої курси", under the greeting. */
export function availableLine(available: number, reviewsLeft: number | null): string {
  const units = `Доступно ${formatUnits(available)}`
  return reviewsLeft === null
    ? `${units}.`
    : `${units} — вистачить приблизно на ${formatReviews(reviewsLeft)}.`
}

export function lowReminder(reviewsLeft: number): string {
  return (
    `Юнітів вистачить приблизно на ${formatReviews(reviewsLeft)}. ` +
    'Купіть пакет заздалегідь, щоб подавати роботи без перерви.'
  )
}

export const NEXT_MAY_FAIL = 'На наступну перевірку юнітів може не вистачити.'

export function expiringReminder(units: number, expiresOn: string): string {
  return `${formatUnits(units)} згорить ${formatDate(expiresOn)}: тоді закінчується строк пакета.`
}

// ── A review that cost more than its reserve (6.3) ────────────────────

export function costOverReserve(costUnits: number, chargedUnits: number): string {
  const charged = formatUnits(chargedUnits)
  return (
    `Фактична вартість (${formatUnits(costUnits)}) перевищила резерв (${charged}). ` +
    `Рецензію надано повністю. Списано ${charged} — стільки було зарезервовано; ` +
    'решту вартості бере на себе платформа.'
  )
}
