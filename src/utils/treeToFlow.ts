import type { Node, Edge } from '@xyflow/react'
import type { NodeWithMaterials } from '../types/api'

import type { Freshness } from '../stores/reconciliation'

export interface FlowNodeData {
  [key: string]: unknown
  nodeId: string
  title: string
  description: string | null
  materials: NodeWithMaterials['materials']
  childrenCount: number
  fingerprint: string | null
  isRoot: boolean
  depth: number
  reconciliationFreshness?: Freshness | null
  reconciliationPolling?: boolean
}

/**
 * Recursively convert API tree to React Flow nodes and edges.
 */
export function treeToFlow(
  node: NodeWithMaterials,
  parentId: string | null = null,
  depth: number = 0,
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<FlowNodeData>[] = []
  const edges: Edge[] = []

  const flowNode: Node<FlowNodeData> = {
    id: node.id,
    type: depth === 0 ? 'courseRoot' : 'section',
    position: { x: 0, y: 0 }, // dagre will reposition
    data: {
      nodeId: node.id,
      title: node.title,
      description: node.description,
      materials: node.materials,
      childrenCount: node.children.length,
      fingerprint: node.node_fingerprint,
      isRoot: depth === 0,
      depth,
    },
  }

  nodes.push(flowNode)

  if (parentId) {
    edges.push({
      id: `e-${parentId}-${node.id}`,
      source: parentId,
      target: node.id,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#1B4D5C', strokeWidth: 2 },
    })
  }

  for (const child of node.children) {
    const childResult = treeToFlow(child, node.id, depth + 1)
    nodes.push(...childResult.nodes)
    edges.push(...childResult.edges)
  }

  return { nodes, edges }
}
