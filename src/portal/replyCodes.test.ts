import { describe, expect, it } from 'vitest'
import {
  ALL_REPLY_CODES,
  DEFAULT_COMMENT_LIMIT,
  DEFAULT_COMMENT_MAX_CHARS,
  replyCodePhrase,
  replyErrorMessage,
  REPLY_GENERIC_ERROR,
  REPLY_NOT_FOUND_ERROR,
  REPLY_OFFLINE_ERROR,
} from './replyCodes'
import { PortalApiError } from './api/portalClient'
import { formatCount } from './studentNote'

describe('replyCodes — dictionary completeness', () => {
  it('covers all seven refusal codes with unique, student-facing uk phrases', () => {
    expect(ALL_REPLY_CODES).toHaveLength(7)
    const phrases = ALL_REPLY_CODES.map((code) => replyCodePhrase(code))
    expect(new Set(phrases).size).toBe(ALL_REPLY_CODES.length)

    for (const phrase of phrases) {
      expect(phrase).not.toBe(REPLY_GENERIC_ERROR)
    }
  })

  it('handles unknown codes by returning the ratified generic error', () => {
    expect(replyCodePhrase('some_unknown_server_code')).toBe(REPLY_GENERIC_ERROR)
    expect(replyCodePhrase('')).toBe(REPLY_GENERIC_ERROR)
  })

  it.each([
    [
      'not_latest_review',
      'Ця рецензія вже не остання — відповідати можна на зауваження останньої рецензії. Оновіть сторінку.',
    ],
    ['unknown_item', 'Цього зауваження в рецензії вже немає. Оновіть сторінку.'],
    [
      'parent_not_in_thread',
      'Коментар, на який ви відповідаєте, не з цієї гілки. Оновіть сторінку й спробуйте ще раз.',
    ],
    [
      'comment_empty',
      'Репліка порожня. Напишіть текст і надішліть знову.',
    ],
    [
      'comment_rejected',
      'Репліку не прийнято: у ній є приховані чи підмінені символи. Такі символи часто приносить текст, скопійований з іншої програми, і деякі емодзі. Приберіть їх і надішліть знову.',
    ],
  ])('maps code %s to exact ratified sentence', (code, expected) => {
    expect(replyCodePhrase(code)).toBe(expected)
  })

  it('formats comment_limit_reached using details.max or fallback of 5', () => {
    expect(replyCodePhrase('comment_limit_reached')).toBe(
      `До цього зауваження вже є ${DEFAULT_COMMENT_LIMIT} ваших реплік. Наступні можна буде написати до рецензії наступної подачі.`,
    )
    expect(replyCodePhrase('comment_limit_reached', { max: 3 })).toBe(
      'До цього зауваження вже є 3 ваших реплік. Наступні можна буде написати до рецензії наступної подачі.',
    )
    expect(replyCodePhrase('comment_limit_reached', { max: '10' })).toBe(
      'До цього зауваження вже є 10 ваших реплік. Наступні можна буде написати до рецензії наступної подачі.',
    )
  })

  it('formats comment_too_long using details.max or fallback of 2 000', () => {
    expect(replyCodePhrase('comment_too_long')).toBe(
      `Репліка задовга — максимум ${formatCount(DEFAULT_COMMENT_MAX_CHARS)} знаків. Скоротіть її й надішліть знову.`,
    )
    expect(replyCodePhrase('comment_too_long', { max: 1500 })).toBe(
      `Репліка задовга — максимум ${formatCount(1500)} знаків. Скоротіть її й надішліть знову.`,
    )
    expect(replyCodePhrase('comment_too_long', { max: '2000' })).toBe(
      `Репліка задовга — максимум ${formatCount(2000)} знаків. Скоротіть її й надішліть знову.`,
    )
  })
})

describe('replyErrorMessage — helper for error handling', () => {
  it('maps 404 to not found phrase', () => {
    const err = new PortalApiError(404, 'portal api 404', { detail: 'Submission not found' })
    expect(replyErrorMessage(err)).toBe(REPLY_NOT_FOUND_ERROR)
  })

  it('maps 422 refusal code to its phrase', () => {
    const err = new PortalApiError(422, 'portal api 422', {
      detail: { code: 'comment_empty', details: {} },
    })
    expect(replyErrorMessage(err)).toBe(replyCodePhrase('comment_empty'))
  })

  it('maps network TypeError to offline phrase', () => {
    const err = new TypeError('Failed to fetch')
    expect(replyErrorMessage(err)).toBe(REPLY_OFFLINE_ERROR)
  })

  it('falls back to generic error for other errors', () => {
    expect(replyErrorMessage(new Error('Unknown error'))).toBe(REPLY_GENERIC_ERROR)
  })
})
