/**
 * The letters a test's options get, as a publication would give them.
 *
 * A mirror of the backend's ``option_letters`` (``homework/test_object.py``,
 * task 07b decision 16): the reading of a saved draft carries the server's
 * letters, but the editor shows unsaved changes too, so it letters them itself
 * (task 07c, question 23.8). The server stays the authority: what a saved draft
 * is shown with comes from its reading.
 */

/** The most options a question has: one letter each. */
export const MAX_OPTIONS = 26

// The Ukrainian alphabet without ґ, й and ь — the backend's own string; its
// first 26 letters are used, as there.
const UKRAINIAN_LETTERS = 'абвгдеєжзиіїклмнопрстуфхцчшщюя'
const LATIN_LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/**
 * The letters options get, in order, in a course of ``language`` (ISO 639-3):
 * Ukrainian for ``ukr``, small Latin letters for any other language or none.
 */
export function optionLetters(language: string | null): string[] {
  const letters = language === 'ukr' ? UKRAINIAN_LETTERS : LATIN_LETTERS
  return Array.from(letters.slice(0, MAX_OPTIONS))
}
