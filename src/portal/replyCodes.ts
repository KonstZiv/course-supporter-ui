import { formatCount } from './studentNote'
import { PortalApiError, replyRefusal } from './api/portalClient'

export const DEFAULT_COMMENT_LIMIT = 5
export const DEFAULT_COMMENT_MAX_CHARS = 2000

export const REPLY_GENERIC_ERROR =
  'Не вдалося надіслати репліку. Спробуйте ще раз.'
export const REPLY_OFFLINE_ERROR =
  'Не вдалося надіслати репліку. Перевірте зʼєднання та спробуйте ще раз.'
export const REPLY_NOT_FOUND_ERROR =
  'Цієї роботи більше немає у вашому списку. Оновіть сторінку.'

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

export function replyCodePhrase(
  code: string,
  details?: Record<string, unknown> | null,
): string {
  const max = details?.max

  switch (code) {
    case 'not_latest_review':
      return 'Ця рецензія вже не остання — відповідати можна на зауваження останньої рецензії. Оновіть сторінку.'
    case 'unknown_item':
      return 'Цього зауваження в рецензії вже немає. Оновіть сторінку.'
    case 'parent_not_in_thread':
      return 'Коментар, на який ви відповідаєте, не з цієї гілки. Оновіть сторінку й спробуйте ще раз.'
    case 'comment_limit_reached': {
      const limit =
        typeof max === 'number'
          ? formatCount(max)
          : typeof max === 'string' && /^\d+$/.test(max)
            ? formatCount(Number(max))
            : max != null
              ? String(max)
              : String(DEFAULT_COMMENT_LIMIT)
      return `До цього зауваження вже є ${limit} ваших реплік. Наступні можна буде написати до рецензії наступної подачі.`
    }
    case 'comment_empty':
      return 'Репліка порожня. Напишіть текст і надішліть знову.'
    case 'comment_too_long': {
      const limit =
        typeof max === 'number'
          ? formatCount(max)
          : typeof max === 'string' && /^\d+$/.test(max)
            ? formatCount(Number(max))
            : max != null
              ? String(max)
              : formatCount(DEFAULT_COMMENT_MAX_CHARS)
      return `Репліка задовга — максимум ${limit} знаків. Скоротіть її й надішліть знову.`
    }
    case 'comment_rejected':
      return 'Репліку не прийнято: у ній є приховані чи підмінені символи. Такі символи часто приносить текст, скопійований з іншої програми, і деякі емодзі. Приберіть їх і надішліть знову.'
    default:
      return REPLY_GENERIC_ERROR
  }
}

export function replyErrorMessage(err: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return REPLY_OFFLINE_ERROR
  }
  if (err instanceof TypeError) {
    return REPLY_OFFLINE_ERROR
  }
  if (err instanceof PortalApiError) {
    if (err.status === 404) {
      return REPLY_NOT_FOUND_ERROR
    }
    const refusal = replyRefusal(err)
    if (refusal) {
      return replyCodePhrase(refusal.code, refusal.details)
    }
  }
  return REPLY_GENERIC_ERROR
}
