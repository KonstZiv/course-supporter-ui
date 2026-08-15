import { api } from './client'
import { uploadWithProgress, type UploadProgress } from './upload'
import type {
  AssignmentType,
  AuthoredDocumentResponse,
  ConfirmFileRolesRequest,
  MaterialRole,
  ProjectBaseAttachResponse,
  ProjectBaseManifest,
  ProjectBaseStateResponse,
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
    onProgress?: (progress: UploadProgress) => void,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_type', sourceType)
    formData.append('material_role', materialRole)
    if (language) formData.append('language', language)
    if (taskType) formData.append('task_type', taskType)
    return uploadWithProgress<AuthoredDocumentCreateResponse>(
      `/api/v1/nodes/${nodeId}/documents`,
      formData,
      onProgress,
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

  // №21 confirm-api: persist the author's file-role decision (full coverage of
  // proposal.files + proposal.tree_digest), then processing is enqueued. 409
  // ``file_roles_stale`` → re-read the document and rebuild the screen; 422 →
  // show the validation message.
  confirmFileRoles: (documentId: string, body: ConfirmFileRolesRequest) =>
    api.post<AuthoredDocumentResponse>(
      `/api/v1/documents/${documentId}/file-roles`,
      body,
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

  // ── KD18 P6: project base archive (author side) ──

  // Attach / re-upload a base archive → 202, a new append-only version starts
  // ``pending`` and normalizes asynchronously (no job_id — poll getBaseState).
  attachBase: (
    documentId: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    return uploadWithProgress<ProjectBaseAttachResponse>(
      `/api/v1/documents/${documentId}/base`,
      formData,
      onProgress,
    )
  },

  // Latest base version's state, ANY state (author monitoring). 404 when no
  // base is attached (NO_BASE_ATTACHED) — the caller renders the attach slot.
  getBaseState: (documentId: string) =>
    api.get<ProjectBaseStateResponse>(`/api/v1/documents/${documentId}/base`),

  // The latest READY base's manifest (typed P1 Manifest). Call ONLY when
  // state='ready' — the route is READY-only (404 otherwise).
  getBaseManifest: (documentId: string) =>
    api.get<ProjectBaseManifest>(
      `/api/v1/documents/${documentId}/base/manifest`,
    ),
}
