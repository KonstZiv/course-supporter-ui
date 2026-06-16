import { describe, it, expect } from 'vitest'
import { treeToFlow } from './treeToFlow'
import type { NodeWithDocuments } from '../types/api'

function makeNode(overrides: Partial<NodeWithDocuments> = {}): NodeWithDocuments {
  return {
    id: 'n1',
    parent_id: null,
    title: 'Root',
    description: null,
    default_language: 'ukr',
    order: 0,
    content_hash: null,
    summary_status: 'none',
    materials_changed: false,
    authored_documents: [],
    children: [],
    ...overrides,
  }
}

describe('treeToFlow — summary badge data passthrough (Task 3.2.5b c2)', () => {
  it('carries summary_status and materials_changed into the root node data', () => {
    const { nodes } = treeToFlow(
      makeNode({ summary_status: 'approved', materials_changed: true }),
    )
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.data.summary_status).toBe('approved')
    expect(nodes[0]!.data.materials_changed).toBe(true)
  })

  it('carries per-node state into children independently', () => {
    const tree = makeNode({
      id: 'root',
      summary_status: 'none',
      materials_changed: false,
      children: [
        makeNode({ id: 'c1', summary_status: 'draft', materials_changed: false }),
        makeNode({ id: 'c2', summary_status: 'approved', materials_changed: true }),
      ],
    })
    const { nodes } = treeToFlow(tree)
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n.data]))
    expect(byId['root']!.summary_status).toBe('none')
    expect(byId['c1']!.summary_status).toBe('draft')
    expect(byId['c1']!.materials_changed).toBe(false)
    expect(byId['c2']!.summary_status).toBe('approved')
    expect(byId['c2']!.materials_changed).toBe(true)
  })
})
