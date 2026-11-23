import { describe, it, expect } from 'vitest'
import { criteriaEditorPath } from './criteriaAddress'

describe('criteriaAddress', () => {
  it('builds criteria editor path for a document', () => {
    expect(criteriaEditorPath('doc-123')).toBe('/task/doc-123/criteria')
  })
})
