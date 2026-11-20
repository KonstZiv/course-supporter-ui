import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'
import { SUPPORT_ADDRESS } from './supportAddress'

// The author's letter to support. Author app only: the portal takes the
// address alone, from `supportAddress`.
export { SUPPORT_ADDRESS }

export function writeToUsPhrase(language: Language): string {
  return translate(language, 'panel.contactAdmin.writeToUsPhrase')
}

export function letterSubject(language: Language): string {
  return translate(language, 'panel.contactAdmin.letterSubject')
}

export interface LetterContext {
  course?: string | null
  section?: string | null
  material?: string | null
  test?: string | null
}

export interface SupportLetterOptions {
  message?: string | null
  context?: LetterContext
  page?: string | null
  now?: Date
}

export interface SupportLetterResult {
  address: string
  subject: string
  body: string
  href: string
}

const MAX_HREF_LENGTH = 1900
const DEFAULT_MESSAGE_LIMIT = 600
const DEFAULT_CONTEXT_LIMIT = 120

export function asksToWriteToAdmin(language: Language, text: string | null | undefined): boolean {
  if (!text) return false
  return text.toLowerCase().includes(writeToUsPhrase(language).toLowerCase())
}

function cleanText(text: string): string {
  return text.trim().replace(/\r\n|\r|\n/g, ' ')
}

function truncateText(text: string, maxLen: number): string {
  if (text.length > maxLen) {
    return text.slice(0, Math.max(0, maxLen - 1)) + '…'
  }
  return text
}

export function formatWhen(now: Date): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  const offsetMin = now.getTimezoneOffset()
  const sign = offsetMin <= 0 ? '+' : '-'
  const absOffset = Math.abs(offsetMin)
  const offH = String(Math.floor(absOffset / 60)).padStart(2, '0')
  const offM = String(absOffset % 60).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes} (UTC${sign}${offH}:${offM})`
}

function renderBody(
  language: Language,
  rawMessage: string | null | undefined,
  context: LetterContext | undefined,
  rawPage: string | null | undefined,
  now: Date | undefined,
  msgLimit: number,
  ctxLimit: number,
): string {
  const hasMessage =
    typeof rawMessage === 'string' && rawMessage.trim().length > 0

  if (!hasMessage) {
    return [
      translate(language, 'panel.contactAdmin.letter.greeting'),
      '',
      translate(language, 'panel.contactAdmin.letter.introNoMessage'),
      '',
      translate(language, 'panel.contactAdmin.letter.myQuestion'),
      '',
      '',
    ].join('\r\n')
  }

  const sanitizedMessage = truncateText(cleanText(rawMessage), msgLimit)
  const contextLines: string[] = []

  const cleanCourse = context?.course ? cleanText(context.course) : ''
  if (cleanCourse) {
    contextLines.push(`${translate(language, 'panel.contactAdmin.letter.context.course')}: ${truncateText(cleanCourse, ctxLimit)}`)
  }

  const cleanSection = context?.section ? cleanText(context.section) : ''
  if (cleanSection) {
    contextLines.push(`${translate(language, 'panel.contactAdmin.letter.context.section')}: ${truncateText(cleanSection, ctxLimit)}`)
  }

  const cleanMaterial = context?.material ? cleanText(context.material) : ''
  if (cleanMaterial) {
    contextLines.push(`${translate(language, 'panel.contactAdmin.letter.context.material')}: ${truncateText(cleanMaterial, ctxLimit)}`)
  }

  const cleanTest = context?.test ? cleanText(context.test) : ''
  if (cleanTest) {
    contextLines.push(`${translate(language, 'panel.contactAdmin.letter.context.test')}: ${truncateText(cleanTest, ctxLimit)}`)
  }

  const cleanPage = rawPage ? cleanText(rawPage) : ''
  if (cleanPage) {
    contextLines.push(`${translate(language, 'panel.contactAdmin.letter.context.page')}: ${truncateText(cleanPage, ctxLimit)}`)
  }

  if (now) {
    contextLines.push(`${translate(language, 'panel.contactAdmin.letter.context.when')}: ${formatWhen(now)}`)
  }

  const lines = [
    translate(language, 'panel.contactAdmin.letter.greeting'),
    '',
    translate(language, 'panel.contactAdmin.letter.introWithMessage'),
    `«${sanitizedMessage}»`,
    '',
    ...contextLines,
    ...(contextLines.length > 0 ? [''] : []),
    translate(language, 'panel.contactAdmin.letter.whatHappened'),
    '',
    '',
  ]

  return lines.join('\r\n')
}

function buildHref(subject: string, body: string): string {
  return `mailto:${SUPPORT_ADDRESS}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}

export function supportLetter(
  language: Language,
  { message, context, page, now }: SupportLetterOptions,
): SupportLetterResult {
  const address = SUPPORT_ADDRESS
  const subject = letterSubject(language)

  let msgLimit = DEFAULT_MESSAGE_LIMIT
  let ctxLimit = DEFAULT_CONTEXT_LIMIT

  let body = renderBody(language, message, context, page, now, msgLimit, ctxLimit)
  let href = buildHref(subject, body)

  if (href.length <= MAX_HREF_LENGTH) {
    return { address, subject, body, href }
  }

  // If href exceeds length, binary search msgLimit down to 1
  let lowMsg = 1
  let highMsg = DEFAULT_MESSAGE_LIMIT
  let bestMsg = 1

  while (lowMsg <= highMsg) {
    const mid = Math.floor((lowMsg + highMsg) / 2)
    const testBody = renderBody(language, message, context, page, now, mid, ctxLimit)
    const testHref = buildHref(subject, testBody)
    if (testHref.length <= MAX_HREF_LENGTH) {
      bestMsg = mid
      lowMsg = mid + 1
    } else {
      highMsg = mid - 1
    }
  }

  msgLimit = bestMsg
  body = renderBody(language, message, context, page, now, msgLimit, ctxLimit)
  href = buildHref(subject, body)

  // If still exceeding, binary search ctxLimit down to 1
  if (href.length > MAX_HREF_LENGTH) {
    msgLimit = 1
    let lowCtx = 1
    let highCtx = DEFAULT_CONTEXT_LIMIT
    let bestCtx = 1

    while (lowCtx <= highCtx) {
      const mid = Math.floor((lowCtx + highCtx) / 2)
      const testBody = renderBody(language, message, context, page, now, 1, mid)
      const testHref = buildHref(subject, testBody)
      if (testHref.length <= MAX_HREF_LENGTH) {
        bestCtx = mid
        lowCtx = mid + 1
      } else {
        highCtx = mid - 1
      }
    }

    ctxLimit = bestCtx
    body = renderBody(language, message, context, page, now, 1, ctxLimit)
    href = buildHref(subject, body)
  }

  return { address, subject, body, href }
}
