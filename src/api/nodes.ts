import { api } from './client'
import type {
  NodeResponse,
  NodeListResponse,
  NodeWithDocuments,
  NodeTreeResponse,
} from '../types/api'

export interface NodeCreateData {
  title: string
  description?: string
  default_language?: string | null
}

export interface NodeUpdateData {
  title?: string
  description?: string | null
  default_language?: string | null
}

export const nodesApi = {
  listRoots: (limit = 50, offset = 0) =>
    api.get<NodeListResponse>(`/api/v1/nodes?limit=${limit}&offset=${offset}`),

  createRoot: (data: NodeCreateData) =>
    api.post<NodeResponse>('/api/v1/nodes', data),

  createChild: (parentId: string, data: NodeCreateData) =>
    api.post<NodeResponse>(`/api/v1/nodes/${parentId}/children`, data),

  getNode: (nodeId: string) =>
    api.get<NodeResponse>(`/api/v1/nodes/${nodeId}`),

  getTree: (nodeId: string) =>
    api.get<NodeTreeResponse[]>(`/api/v1/nodes/${nodeId}/tree`),

  getDetail: (nodeId: string) =>
    api.get<NodeWithDocuments>(`/api/v1/nodes/${nodeId}/detail`),

  update: (nodeId: string, data: NodeUpdateData) =>
    api.patch<NodeResponse>(`/api/v1/nodes/${nodeId}`, data),

  delete: (nodeId: string) =>
    api.delete<void>(`/api/v1/nodes/${nodeId}`),

  move: (nodeId: string, newParentId: string | null) =>
    api.post<NodeResponse>(`/api/v1/nodes/${nodeId}/move`, {
      new_parent_id: newParentId,
    }),

  reorder: (nodeId: string, newOrder: number) =>
    api.post<NodeResponse>(`/api/v1/nodes/${nodeId}/reorder`, {
      new_order: newOrder,
    }),
}
