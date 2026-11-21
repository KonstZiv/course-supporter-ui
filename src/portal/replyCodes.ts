import { DEFAULT_LANGUAGE, type Language } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'
import { formatCount } from './studentNote'
import { PortalApiError, replyRefusal } from './api/portalClient'

export const DEFAULT_COMMENT_LIMIT = 5
export const DEFAULT_COMMENT_MAX_CHARS = 2000

export const REPLY_GENERIC_ERROR = translate('uk', 'portal.replies.error.generic')
export const REPLY_OFFLINE_ERROR = translate('uk', 'portal.replies.error.offline')
export const REPLY_NOT_FOUND_ERROR = translate('uk', 'portal.replies.error.notFound')

export const ALL_REPLY_CODES = [
  'not_latest_review',
  'unknown_item',
  'parent_not_in_thread',
  'comment_limit_reached',
  'comment_empty',
  'comment_too_long',
  'comment_rejected',
] as const

export type ReplyCode = (typeof ALL_REPLY_CODES)[number]

const CODE_KEYS: Record<ReplyCode, MessageKey> = {
  not_latest_review: 'portal.replies.error.notLatestReview',
  unknown_item: 'portal.replies.error.unknownItem',
  parent_not_in_thread: 'portal.replies.error.parentNotInThread',
  comment_limit_reached: 'portal.replies.error.limitReached',
  comment_empty: 'portal.replies.error.empty',
  comment_too_long: 'portal.replies.error.tooLong',
  comment_rejected: 'portal.replies.error.rejected',
}

export function replyCodePhrase(
  code: string,
  details?: Record<string, unknown> | null,
): string
export function replyCodePhrase(
  language: Language,
  code: string,
  details?: Record<string, unknown> | null,
): string
export function replyCodePhrase(
  langOrCode: Language | string,
  codeOrDetails?: string | Record<string, unknown> | null,
  maybeDetails?: Record<string, unknown> | null,
): string {
  let language: Language = DEFAULT_LANGUAGE
  let code: string
  let details: Record<string, unknown> | null | undefined

  if (langOrCode === 'uk' || langOrCode === 'en') {
    language = langOrCode
    code = codeOrDetails as string
    details = maybeDetails
  } else {
    code = langOrCode
    details = codeOrDetails as Record<string, unknown> | null | undefined
  }

  const key = CODE_KEYS[code as ReplyCode]
  if (!key) {
    return translate(language, 'portal.replies.error.generic')
  }

  const max = details?.max

  if (code === 'comment_limit_reached') {
    const limit =
      typeof max === 'number'
        ? formatCount(max)
        : typeof max === 'string' && /^\d+$/.test(max)
          ? formatCount(Number(max))
          : max != null
            ? String(max)
            : String(DEFAULT_COMMENT_LIMIT)
    return translate(language, key, { limit })
  }

  if (code === 'comment_too_long') {
    const limit =
      typeof max === 'number'
        ? formatCount(max)
        : typeof max === 'string' && /^\d+$/.test(max)
          ? formatCount(Number(max))
          : max != null
            ? String(max)
            : formatCount(DEFAULT_COMMENT_MAX_CHARS)
    return translate(language, key, { limit })
  }

  return translate(language, key)
}

export function replyErrorMessage(err: unknown, language?: Language): string
export function replyErrorMessage(language: Language, err: unknown): string
export function replyErrorMessage(
  first: unknown,
  second?: unknown,
): string {
  let language: Language = DEFAULT_LANGUAGE
  let err: unknown

  if (first === 'uk' || first === 'en') {
    language = first
    err = second
  } else if (second === 'uk' || second === 'en') {
    language = second
    err = first
  } else {
    err = first
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return translate(language, 'portal.replies.error.offline')
  }
  if (err instanceof TypeError) {
    return translate(language, 'portal.replies.error.offline')
  }
  if (err instanceof PortalApiError) {
    if (err.status === 404) {
      return translate(language, 'portal.replies.error.notFound')
    }
    const refusal = replyRefusal(err)
    if (refusal) {
      return replyCodePhrase(language, refusal.code, refusal.details)
    }
  }
  return translate(language, 'portal.replies.error.generic')
}
