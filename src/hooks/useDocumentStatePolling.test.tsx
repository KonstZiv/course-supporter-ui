import { describe, it, expect, vi } from 'vitest'

// Mock the api/nodes module to break the transitive import chain into the
// auth store, which eagerly reads from localStorage at module init and is
// not available in this vitest + jsdom setup. The pure-function tests
// below do not exercise the API call path; the mock just keeps the import
// graph quiet.
vi.mock('../api/nodes', () => ({
  nodesApi: { getDetail: vi.fn() },
}))

import { hasAnyPendingDocument } from './useDocumentStatePolling'
import type {
  AuthoredDocumentSummary,
  DocumentState,
  NodeWithDocuments,
} from '../types/api'

function makeDocument(state: DocumentState): AuthoredDocumentSummary {
  return {
    id: 'doc-id',
    course_node_id: 'node-id',
    source_type: 'text',
    material_role: 'educational',
    task_type: null,
    order: 0,
    filename: 'file.txt',
    source_url: 'https://example/file.txt',
    language: null,
    state,
    content_fingerprint: null,
    error_message: null,
    created_at: '2026-05-07T00:00:00Z',
  }
}

function makeNode(overrides: Partial<NodeWithDocuments> = {}): NodeWithDocuments {
  return {
    id: 'node-id',
    parent_id: null,
    title: 'Node',
    description: null,
    default_language: null,
    order: 0,
    content_hash: null,
    authored_documents: [],
    children: [],
    ...overrides,
  }
}

describe('hasAnyPendingDocument', () => {
  it('returns false for an empty tree', () => {
    expect(hasAnyPendingDocument(makeNode())).toBe(false)
  })

  it('returns false when all documents are settled', () => {
    const tree = makeNode({
      authored_documents: [
        makeDocument('ready'),
        makeDocument('error'),
        makeDocument('raw'),
      ],
    })
    expect(hasAnyPendingDocument(tree)).toBe(false)
  })

  it('returns true when the root node has a pending document', () => {
    const tree = makeNode({
      authored_documents: [makeDocument('ready'), makeDocument('pending')],
    })
    expect(hasAnyPendingDocument(tree)).toBe(true)
  })

  it('returns true when a nested child has a pending document', () => {
    const tree = makeNode({
      children: [
        makeNode({
          children: [
            makeNode({ authored_documents: [makeDocument('pending')] }),
          ],
        }),
      ],
    })
    expect(hasAnyPendingDocument(tree)).toBe(true)
  })

  it('returns false when integrity_broken is the only non-ready state', () => {
    const tree = makeNode({
      authored_documents: [makeDocument('integrity_broken')],
    })
    expect(hasAnyPendingDocument(tree)).toBe(false)
  })
})
