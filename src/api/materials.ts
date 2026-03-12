import { api } from './client'
import type { MaterialEntryResponse } from '../types/api'

export interface MaterialCreateResponse {
  id: string
  node_id: string
  source_type: string
  filename: string | null
  state: string
  job_id: string | null
}

export const materialsApi = {
  upload: (nodeId: string, file: File, sourceType: string = 'presentation') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_type', sourceType)
    return api.post<MaterialCreateResponse>(
      `/api/v1/nodes/${nodeId}/materials`,
      formData,
    )
  },

  uploadUrl: (nodeId: string, url: string, sourceType: string = 'web') => {
    const formData = new FormData()
    formData.append('source_url', url)
    formData.append('source_type', sourceType)
    return api.post<MaterialCreateResponse>(
      `/api/v1/nodes/${nodeId}/materials`,
      formData,
    )
  },

  list: (nodeId: string) =>
    api.get<MaterialEntryResponse[]>(`/api/v1/nodes/${nodeId}/materials`),

  get: (entryId: string) =>
    api.get<MaterialEntryResponse>(`/api/v1/materials/${entryId}`),

  delete: (entryId: string) =>
    api.delete<void>(`/api/v1/materials/${entryId}`),

  retry: (entryId: string) =>
    api.post<{ job_id: string }>(`/api/v1/materials/${entryId}/retry`),
}
