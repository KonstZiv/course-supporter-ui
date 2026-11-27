import ukPanel from '../i18n/catalogs/uk/panel.json'

const REVIEW_HEADINGS = new Set([
  ukPanel['panel.submission.reviewTitle'].toLowerCase(),
  'review',
])

/**
 * Removes a redundant leading Markdown heading ("Рецензія" / "Review", any
 * heading level, case-insensitive, ignoring trailing punctuation) when it is
 * the first non-empty line of ``review_markdown``. Other headings are kept.
 */
export function stripLeadingReviewHeading(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const firstIndex = lines.findIndex((line) => line.trim() !== '')
  if (firstIndex === -1) return markdown

  const match = /^\s{0,3}#{1,6}\s+(.*)$/.exec(lines[firstIndex]!)
  if (!match) return markdown

  const headingText = match[1]!
    .replace(/\s+#+\s*$/, '')
    .replace(/[\p{P}\s]+$/u, '')
    .trim()
    .toLowerCase()

  if (!REVIEW_HEADINGS.has(headingText)) return markdown

  return lines.slice(firstIndex + 1).join('\n').replace(/^\n+/, '')
}
