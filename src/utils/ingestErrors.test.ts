import { describe, it, expect } from 'vitest'
import { ingestErrorMessage } from './ingestErrors'

describe('ingestErrorMessage', () => {
  it('resolves a known async category to the stable message', () => {
    expect(ingestErrorMessage('empty_document')).toContain(
      'не містить видобувного вмісту',
    )
  })

  it('resolves a known sync (upload) category to the stable message', () => {
    expect(ingestErrorMessage('suspicious_unicode')).toContain(
      'невидимі службові символи',
    )
  })

  it('resolves the external-source class', () => {
    expect(ingestErrorMessage('external_source_unavailable')).toContain(
      'Не вдалося відкрити посилання',
    )
  })

  it('degrades an unknown category to the generic phrase, never a raw string', () => {
    expect(ingestErrorMessage('mystery_code')).toBe(
      ingestErrorMessage('pipeline_failure'),
    )
  })

  it('degrades a null category to the generic phrase', () => {
    expect(ingestErrorMessage(null)).toBe(ingestErrorMessage('pipeline_failure'))
  })

  it('never renders blank', () => {
    expect(ingestErrorMessage(null).length).toBeGreaterThan(0)
  })
})
