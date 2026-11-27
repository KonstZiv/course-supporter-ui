import { describe, expect, it } from 'vitest'
import { stripLeadingReviewHeading } from './reviewMarkdown'

describe('stripLeadingReviewHeading', () => {
  it('strips a leading "# Рецензія" or "## Review" heading of any level', () => {
    expect(stripLeadingReviewHeading('# Рецензія\n\nДобре виконано.')).toBe(
      'Добре виконано.',
    )
    expect(stripLeadingReviewHeading('\n\n### review:\n\nWell done.')).toBe(
      'Well done.',
    )
    expect(stripLeadingReviewHeading('## РЕЦЕНЗІЯ.\nЗауваження.')).toBe(
      'Зауваження.',
    )
  })

  it('keeps other headings and non-leading Review headings intact', () => {
    const other = '## Good job\n\nAll **tests** passed.'
    expect(stripLeadingReviewHeading(other)).toBe(other)

    const extended = '# Рецензія на роботу\n\nДобре.'
    expect(stripLeadingReviewHeading(extended)).toBe(extended)

    const nested = '## Підсумок\n\n# Рецензія\n\nТекст.'
    expect(stripLeadingReviewHeading(nested)).toBe(nested)

    const plain = 'Рецензія\n\nТекст.'
    expect(stripLeadingReviewHeading(plain)).toBe(plain)
  })
})
