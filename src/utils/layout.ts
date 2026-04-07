import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 280
const NODE_HEIGHT = 140
const ROOT_WIDTH = 320
const ROOT_HEIGHT = 160

/**
 * Apply dagre layout to React Flow nodes.
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: direction,
    ranksep: 100,
    nodesep: 50,
    marginx: 50,
    marginy: 50,
  })

  for (const node of nodes) {
    const isRoot = node.type === 'courseRoot'
    g.setNode(node.id, {
      width: isRoot ? ROOT_WIDTH : NODE_WIDTH,
      height: isRoot ? ROOT_HEIGHT : NODE_HEIGHT,
    })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  const laid = nodes.map((node) => {
    const pos = g.node(node.id)
    const isRoot = node.type === 'courseRoot'
    const w = isRoot ? ROOT_WIDTH : NODE_WIDTH
    const h = isRoot ? ROOT_HEIGHT : NODE_HEIGHT
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    }
  })

  return { nodes: laid, edges }
}
