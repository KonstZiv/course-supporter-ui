import { describe, it, expect } from 'vitest'
import { ingestErrorMessage } from './ingestErrors'

describe('ingestErrorMessage', () => {
  it('resolves a known category to the stable message', () => {
    expect(ingestErrorMessage('empty_document', 'raw backend text')).toContain(
      'не містить видобувного вмісту',
    )
  })

  it('falls back to the raw error_message for unknown categories', () => {
    expect(ingestErrorMessage('mystery_code', 'raw backend text')).toBe(
      'raw backend text',
    )
  })

  it('falls back to the raw error_message when category is null', () => {
    expect(ingestErrorMessage(null, 'legacy failure')).toBe('legacy failure')
  })

  it('never renders blank', () => {
    expect(ingestErrorMessage(null, null)).toBe('Обробка завершилася помилкою.')
  })
})
