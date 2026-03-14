import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useCourseStore } from '../../stores/course'
import { useReconciliationStore } from '../../stores/reconciliation'
import { reconciliationApi } from '../../api/reconciliation'
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
  const reconNodes = useReconciliationStore((s) => s.nodes)
  const setNodeStatus = useReconciliationStore((s) => s.setNodeStatus)
  const getPollingNodeIds = useReconciliationStore((s) => s.getPollingNodeIds)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [menu, setMenu] = useState<MenuPosition | null>(null)

  // Background poller for active reconciliation jobs
  const pollerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    pollerRef.current = setInterval(async () => {
      const ids = getPollingNodeIds()
      for (const nodeId of ids) {
        try {
          const status = await reconciliationApi.getStatus(nodeId)
          setNodeStatus(nodeId, {
            jobId: status.job_id,
            jobStatus: status.job_status as 'queued' | 'active' | 'complete' | 'failed' | null,
            preview: status.preview,
            freshness: status.freshness,
          })
        } catch {
          // Ignore polling errors silently
        }
      }
    }, 4000)

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current)
    }
  }, [getPollingNodeIds, setNodeStatus])

  // Convert tree to flow layout + merge reconciliation state
  useEffect(() => {
    if (!tree) return
    const { nodes: raw, edges: rawEdges } = treeToFlow(tree)

    // Merge reconciliation overlay data into flow nodes
    const merged = raw.map((n) => {
      const rs = reconNodes[n.data.nodeId]
      if (!rs) return n
      return {
        ...n,
        data: {
          ...n.data,
          reconciliationFreshness: rs.freshness,
          reconciliationPolling: rs.jobStatus === 'queued' || rs.jobStatus === 'active',
        },
      }
    })

    const { nodes: laid, edges: laidEdges } = applyDagreLayout(merged, rawEdges)
    setNodes(laid as Node<FlowNodeData>[])
    setEdges(laidEdges)
  }, [tree, reconNodes, setNodes, setEdges])

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
