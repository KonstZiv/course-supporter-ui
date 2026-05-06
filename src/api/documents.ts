import { api } from './client'
import type {
  AssignmentType,
  AuthoredDocumentResponse,
  MaterialRole,
} from '../types/api'

export interface AuthoredDocumentCreateResponse {
  id: string
  course_node_id: string
  source_type: string
  filename: string | null
  state: string
  job_id: string | null
}

export const documentsApi = {
  upload: (
    nodeId: string,
    file: File,
    sourceType: string = 'presentation',
    materialRole: string = 'educational',
    language?: string | null,
    taskType?: AssignmentType | null,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_type', sourceType)
    formData.append('material_role', materialRole)
    if (language) formData.append('language', language)
    if (taskType) formData.append('task_type', taskType)
    return api.post<AuthoredDocumentCreateResponse>(
      `/api/v1/nodes/${nodeId}/documents`,
      formData,
    )
  },

  uploadUrl: (
    nodeId: string,
    url: string,
    sourceType: string = 'web',
    materialRole: string = 'educational',
    language?: string | null,
    taskType?: AssignmentType | null,
  ) => {
    const formData = new FormData()
    formData.append('source_url', url)
    formData.append('source_type', sourceType)
    formData.append('material_role', materialRole)
    if (language) formData.append('language', language)
    if (taskType) formData.append('task_type', taskType)
    return api.post<AuthoredDocumentCreateResponse>(
      `/api/v1/nodes/${nodeId}/documents`,
      formData,
    )
  },

  list: (nodeId: string) =>
    api.get<AuthoredDocumentResponse[]>(`/api/v1/nodes/${nodeId}/documents`),

  get: (entryId: string) =>
    api.get<AuthoredDocumentResponse>(`/api/v1/documents/${entryId}`),

  delete: (entryId: string) =>
    api.delete<void>(`/api/v1/documents/${entryId}`),

  retry: (entryId: string, force: boolean = false) =>
    api.post<{ job_id: string }>(
      `/api/v1/documents/${entryId}/retry${force ? '?force=true' : ''}`,
    ),

  update: (
    entryId: string,
    patch: {
      material_role?: MaterialRole
      task_type?: AssignmentType | null
    },
  ) =>
    api.patch<AuthoredDocumentResponse>(
      `/api/v1/documents/${entryId}`,
      patch,
    ),
}
