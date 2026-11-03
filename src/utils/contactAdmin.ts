export const SUPPORT_ADDRESS = 'support@pythoncourse.me'
export const WRITE_TO_US_PHRASE = 'напишіть нам'
export const LETTER_SUBJECT = 'Course Supporter: звернення з програми автора'

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

export function asksToWriteToAdmin(text: string | null | undefined): boolean {
  if (!text) return false
  return text.toLowerCase().includes(WRITE_TO_US_PHRASE.toLowerCase())
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
      'Добрий день!',
      '',
      'Звертаюся з програми автора Course Supporter.',
      '',
      'Моє питання:',
      '',
      '',
    ].join('\r\n')
  }

  const sanitizedMessage = truncateText(cleanText(rawMessage), msgLimit)
  const contextLines: string[] = []

  const cleanCourse = context?.course ? cleanText(context.course) : ''
  if (cleanCourse) {
    contextLines.push(`Курс: ${truncateText(cleanCourse, ctxLimit)}`)
  }

  const cleanSection = context?.section ? cleanText(context.section) : ''
  if (cleanSection) {
    contextLines.push(`Розділ: ${truncateText(cleanSection, ctxLimit)}`)
  }

  const cleanMaterial = context?.material ? cleanText(context.material) : ''
  if (cleanMaterial) {
    contextLines.push(`Матеріал: ${truncateText(cleanMaterial, ctxLimit)}`)
  }

  const cleanTest = context?.test ? cleanText(context.test) : ''
  if (cleanTest) {
    contextLines.push(`Тест: ${truncateText(cleanTest, ctxLimit)}`)
  }

  const cleanPage = rawPage ? cleanText(rawPage) : ''
  if (cleanPage) {
    contextLines.push(`Сторінка: ${truncateText(cleanPage, ctxLimit)}`)
  }

  if (now) {
    contextLines.push(`Коли: ${formatWhen(now)}`)
  }

  const lines = [
    'Добрий день!',
    '',
    'Звертаюся з програми автора Course Supporter. Програма показала повідомлення:',
    `«${sanitizedMessage}»`,
    '',
    ...contextLines,
    ...(contextLines.length > 0 ? [''] : []),
    'Що відбувалося перед цим — кілька слів:',
    '',
    '',
  ]

  return lines.join('\r\n')
}

function buildHref(body: string): string {
  return `mailto:${SUPPORT_ADDRESS}?subject=${encodeURIComponent(
    LETTER_SUBJECT,
  )}&body=${encodeURIComponent(body)}`
}

export function supportLetter({
  message,
  context,
  page,
  now,
}: SupportLetterOptions): SupportLetterResult {
  const address = SUPPORT_ADDRESS
  const subject = LETTER_SUBJECT

  let msgLimit = DEFAULT_MESSAGE_LIMIT
  let ctxLimit = DEFAULT_CONTEXT_LIMIT

  let body = renderBody(message, context, page, now, msgLimit, ctxLimit)
  let href = buildHref(body)

  if (href.length <= MAX_HREF_LENGTH) {
    return { address, subject, body, href }
  }

  // If href exceeds length, binary search msgLimit down to 1
  let lowMsg = 1
  let highMsg = DEFAULT_MESSAGE_LIMIT
  let bestMsg = 1

  while (lowMsg <= highMsg) {
    const mid = Math.floor((lowMsg + highMsg) / 2)
    const testBody = renderBody(message, context, page, now, mid, ctxLimit)
    const testHref = buildHref(testBody)
    if (testHref.length <= MAX_HREF_LENGTH) {
      bestMsg = mid
      lowMsg = mid + 1
    } else {
      highMsg = mid - 1
    }
  }

  msgLimit = bestMsg
  body = renderBody(message, context, page, now, msgLimit, ctxLimit)
  href = buildHref(body)

  // If still exceeding, binary search ctxLimit down to 1
  if (href.length > MAX_HREF_LENGTH) {
    msgLimit = 1
    let lowCtx = 1
    let highCtx = DEFAULT_CONTEXT_LIMIT
    let bestCtx = 1

    while (lowCtx <= highCtx) {
      const mid = Math.floor((lowCtx + highCtx) / 2)
      const testBody = renderBody(message, context, page, now, 1, mid)
      const testHref = buildHref(testBody)
      if (testHref.length <= MAX_HREF_LENGTH) {
        bestCtx = mid
        lowCtx = mid + 1
      } else {
        highCtx = mid - 1
      }
    }

    ctxLimit = bestCtx
    body = renderBody(message, context, page, now, 1, ctxLimit)
    href = buildHref(body)
  }

  return { address, subject, body, href }
}
