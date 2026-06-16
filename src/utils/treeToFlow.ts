import type { Node, Edge } from '@xyflow/react'
import type { NodeWithDocuments } from '../types/api'

export interface FlowNodeData {
  [key: string]: unknown
  nodeId: string
  title: string
  description: string | null
  authored_documents: NodeWithDocuments['authored_documents']
  childrenCount: number
  fingerprint: string | null
  summary_status: NodeWithDocuments['summary_status']
  materials_changed: boolean
  isRoot: boolean
  depth: number
}

/**
 * Recursively convert API tree to React Flow nodes and edges.
 */
export function treeToFlow(
  node: NodeWithDocuments,
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
      authored_documents: node.authored_documents,
      childrenCount: node.children.length,
      fingerprint: node.content_hash,
      summary_status: node.summary_status,
      materials_changed: node.materials_changed,
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
      type: 'default',
      animated: false,
      style: { stroke: '#C0BDB6', strokeWidth: 1.5 },
    })
  }

  for (const child of node.children) {
    const childResult = treeToFlow(child, node.id, depth + 1)
    nodes.push(...childResult.nodes)
    edges.push(...childResult.edges)
  }

  return { nodes, edges }
}
