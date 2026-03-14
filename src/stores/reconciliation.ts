import { create } from 'zustand'
import type { ReconciliationPreviewResponse } from '../types/api'

export type Freshness = 'fresh' | 'stale_materials' | 'stale_edited' | 'stale_both' | 'none'

export interface NodeReconciliationState {
  jobId: string | null
  jobStatus: 'queued' | 'active' | 'complete' | 'failed' | null
  preview: ReconciliationPreviewResponse | null
  freshness: Freshness
}

interface ReconciliationStore {
  nodes: Record<string, NodeReconciliationState>
  setNodeStatus: (nodeId: string, state: Partial<NodeReconciliationState>) => void
  clearNode: (nodeId: string) => void
  getPollingNodeIds: () => string[]
}

export const useReconciliationStore = create<ReconciliationStore>((set, get) => ({
  nodes: {},

  setNodeStatus: (nodeId, partial) =>
    set((s) => ({
      nodes: {
        ...s.nodes,
        [nodeId]: {
          ...(s.nodes[nodeId] ?? { jobId: null, jobStatus: null, preview: null, freshness: 'none' }),
          ...partial,
        },
      },
    })),

  clearNode: (nodeId) =>
    set((s) => {
      const { [nodeId]: _, ...rest } = s.nodes
      return { nodes: rest }
    }),

  getPollingNodeIds: () => {
    const { nodes } = get()
    return Object.entries(nodes)
      .filter(([, n]) => n.jobStatus === 'queued' || n.jobStatus === 'active')
      .map(([id]) => id)
  },
}))
