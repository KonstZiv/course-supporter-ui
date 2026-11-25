import { describe, expect, it } from 'vitest'
import {
  ALL_REPLY_CODES,
  replyCodePhrase,
  replyErrorMessage,
  REPLY_GENERIC_ERROR,
  REPLY_NOT_FOUND_ERROR,
  REPLY_OFFLINE_ERROR,
} from './replyCodes'
import { PortalApiError } from './api/portalClient'

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

  it.each([
    [undefined, '5 ваших реплік'],
    [{ max: 1 }, '1 ваша репліка'],
    [{ max: 2 }, '2 ваші репліки'],
    [{ max: 3 }, '3 ваші репліки'],
    [{ max: 4 }, '4 ваші репліки'],
    [{ max: 5 }, '5 ваших реплік'],
    [{ max: 11 }, '11 ваших реплік'],
    [{ max: 21 }, '21 ваша репліка'],
    [{ max: 22 }, '22 ваші репліки'],
    [{ max: '10' }, '10 ваших реплік'],
    [{ max: 'abc' }, '5 ваших реплік'],
  ])('formats comment_limit_reached (uk) for details %j as phrase "%s"', (details, phrase) => {
    expect(replyCodePhrase('comment_limit_reached', details)).toBe(
      `До цього зауваження вже є ${phrase}. Наступні можна буде написати до рецензії наступної подачі.`,
    )
  })

  it.each([
    [undefined, '2\u00a0000 знаків'],
    [{ max: 1 }, '1 знак'],
    [{ max: 2 }, '2 знаки'],
    [{ max: 5 }, '5 знаків'],
    [{ max: 21 }, '21 знак'],
    [{ max: 1500 }, '1\u00a0500 знаків'],
    [{ max: 2001 }, '2\u00a0001 знак'],
    [{ max: '2000' }, '2\u00a0000 знаків'],
    [{ max: 'abc' }, '2\u00a0000 знаків'],
  ])('formats comment_too_long (uk) for details %j as phrase "%s"', (details, phrase) => {
    expect(replyCodePhrase('comment_too_long', details)).toBe(
      `Репліка задовга — максимум ${phrase}. Скоротіть її й надішліть знову.`,
    )
  })

  it.each([
    [
      'comment_limit_reached',
      { max: 1 },
      'You already have 1 reply to this remark. You will be able to write more with the review of your next submission.',
    ],
    [
      'comment_limit_reached',
      { max: 3 },
      'You already have 3 replies to this remark. You will be able to write more with the review of your next submission.',
    ],
    [
      'comment_too_long',
      { max: 1 },
      'The reply is too long — 1 character at most. Shorten it and send again.',
    ],
    [
      'comment_too_long',
      undefined,
      'The reply is too long — 2\u00a0000 characters at most. Shorten it and send again.',
    ],
  ])('formats English phrases for %s with details %j', (code, details, expected) => {
    expect(replyCodePhrase(code, details, 'en')).toBe(expected)
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
