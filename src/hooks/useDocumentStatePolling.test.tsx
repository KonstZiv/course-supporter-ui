import { describe, it, expect, vi } from 'vitest'

// Mock the api/nodes module to break the transitive import chain into the
// auth store, which eagerly reads from localStorage at module init and is
// not available in this vitest + jsdom setup. The pure-function tests
// below do not exercise the API call path; the mock just keeps the import
// graph quiet.
vi.mock('../api/nodes', () => ({
  nodesApi: { getDetail: vi.fn() },
}))

import { hasAnyInFlightDocument } from './useDocumentStatePolling'
import type {
  AuthoredDocumentSummary,
  NodeWithDocuments,
  ProcessingPhase,
} from '../types/api'

function makeDocument(phase: ProcessingPhase): AuthoredDocumentSummary {
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
    // The coarse axis is irrelevant to the poll now; keep it plausible
    // (inverse of derive_processing_phase) for fixture realism.
    state:
      phase === 'error'
        ? 'error'
        : phase === 'queued' || phase === 'processing'
          ? 'pending'
          : 'ready',
    processing_phase: phase,
    content_fingerprint: null,
    error_message: null,
    error_category: null,
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
    summary_status: 'none',
    materials_changed: false,
    authored_documents: [],
    children: [],
    ...overrides,
  }
}

describe('hasAnyInFlightDocument', () => {
  it('returns false for an empty tree', () => {
    expect(hasAnyInFlightDocument(makeNode())).toBe(false)
  })

  it('returns false when every document is at rest (awaiting_author / ready / error)', () => {
    // The equivalence-preserving case (TASK-B §3 Б3): the poll must STOP at
    // awaiting_author — the system waits on the author, not on itself.
    const tree = makeNode({
      authored_documents: [
        makeDocument('awaiting_author'),
        makeDocument('ready'),
        makeDocument('error'),
      ],
    })
    expect(hasAnyInFlightDocument(tree)).toBe(false)
  })

  it('returns true for a queued document', () => {
    const tree = makeNode({
      authored_documents: [makeDocument('ready'), makeDocument('queued')],
    })
    expect(hasAnyInFlightDocument(tree)).toBe(true)
  })

  it('returns true for a processing document', () => {
    const tree = makeNode({
      authored_documents: [makeDocument('processing')],
    })
    expect(hasAnyInFlightDocument(tree)).toBe(true)
  })

  it('returns true when a nested child is in flight', () => {
    const tree = makeNode({
      children: [
        makeNode({
          children: [
            makeNode({ authored_documents: [makeDocument('processing')] }),
          ],
        }),
      ],
    })
    expect(hasAnyInFlightDocument(tree)).toBe(true)
  })
})
