import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type NodeMouseHandler,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCourseStore } from '../../stores/course'
import { treeToFlow, type FlowNodeData } from '../../utils/treeToFlow'
import { applyDagreLayout } from '../../utils/layout'
import { CourseRootNode } from './nodes/CourseRootNode'
import { SectionNode } from './nodes/SectionNode'
import { FlowContextMenu, type MenuPosition } from './FlowContextMenu'

const nodeTypes: NodeTypes = {
  courseRoot: CourseRootNode,
  section: SectionNode,
}

export function CourseCanvas() {
  const tree = useCourseStore((s) => s.tree)
  const setSelectedNodeId = useCourseStore((s) => s.setSelectedNodeId)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [menu, setMenu] = useState<MenuPosition | null>(null)

  // Convert tree to flow layout
  useEffect(() => {
    if (!tree) return
    const { nodes: raw, edges: rawEdges } = treeToFlow(tree)
    const { nodes: laid, edges: laidEdges } = applyDagreLayout(raw, rawEdges)
    setNodes(laid)
    setEdges(laidEdges)
  }, [tree, setNodes, setEdges])

  const onNodeClick: NodeMouseHandler<Node<FlowNodeData>> = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.data.nodeId)
      setMenu(null)
    },
    [setSelectedNodeId],
  )

  const onNodeContextMenu: NodeMouseHandler<Node<FlowNodeData>> = useCallback(
    (event, node) => {
      event.preventDefault()
      setSelectedNodeId(node.data.nodeId)
      setMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.data.nodeId,
        nodeTitle: node.data.title,
        isRoot: node.data.isRoot,
      })
    },
    [setSelectedNodeId],
  )

  const onPaneClick = useCallback(() => {
    setMenu(null)
  }, [])

  const minimapNodeColor = useMemo(
    () => (node: Node) => (node.type === 'courseRoot' ? '#1B4D5C' : '#2A6B7C'),
    [],
  )

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#D0CDC4" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={minimapNodeColor}
          maskColor="rgba(250,250,247,0.8)"
          pannable
          zoomable
        />
      </ReactFlow>

      {menu && (
        <FlowContextMenu position={menu} onClose={() => setMenu(null)} />
      )}
    </div>
  )
}
