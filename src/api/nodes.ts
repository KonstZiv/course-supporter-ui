import { api } from './client'
import type {
  NodeResponse,
  NodeListResponse,
  NodeWithMaterials,
  NodeTreeResponse,
} from '../types/api'

export const nodesApi = {
  listRoots: (limit = 50, offset = 0) =>
    api.get<NodeListResponse>(`/api/v1/nodes?limit=${limit}&offset=${offset}`),

  createRoot: (title: string, description?: string) =>
    api.post<NodeResponse>('/api/v1/nodes', { title, description }),

  createChild: (parentId: string, title: string, description?: string) =>
    api.post<NodeResponse>(`/api/v1/nodes/${parentId}/children`, { title, description }),

  getNode: (nodeId: string) =>
    api.get<NodeResponse>(`/api/v1/nodes/${nodeId}`),

  getTree: (nodeId: string) =>
    api.get<NodeTreeResponse[]>(`/api/v1/nodes/${nodeId}/tree`),

  getDetail: (nodeId: string) =>
    api.get<NodeWithMaterials>(`/api/v1/nodes/${nodeId}/detail`),

  update: (nodeId: string, data: { title?: string; description?: string }) =>
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
