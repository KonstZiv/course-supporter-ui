import { api } from './client'
import type {
  EditableTreeResponse,
  EditableNodeResponse,
  EditableNodeUpdateRequest,
} from '../types/api'

export const editableApi = {
  getTree: (nodeId: string) =>
    api.get<EditableTreeResponse>(`/api/v1/nodes/${nodeId}/editable`),

  updateField: (nodeId: string, editableId: string, fields: EditableNodeUpdateRequest) =>
    api.patch<EditableNodeResponse>(`/api/v1/nodes/${nodeId}/editable/${editableId}`, fields),

  init: (nodeId: string, body?: { snapshot_id?: string; preserve_edited?: boolean }) =>
    api.post<EditableTreeResponse>(`/api/v1/nodes/${nodeId}/editable/init`, body ?? {}),
}
