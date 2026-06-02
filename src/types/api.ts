// ─── Enums ───

export type SourceType = 'video' | 'presentation' | 'text' | 'web' | 'audio'
export type DocumentState = 'raw' | 'pending' | 'ready' | 'integrity_broken' | 'error'
export type MaterialRole = 'educational' | 'methodological'
export type AssignmentType = 'test' | 'short_task' | 'task' | 'project'
export type JobStatus = 'queued' | 'active' | 'complete' | 'failed'

// ─── Course languages (Task 2.4.13) ───
// Whitelist + display metadata served by GET /api/v1/config/languages.
// Codes are canonical ISO 639-3; name_native is best-effort (iso639 SIL
// table does not always carry it — UI falls back to name_en).

export interface LanguageEntry {
  code: string
  name_en: string
  name_native: string | null
}

export interface AllowedLanguagesResponse {
  items: LanguageEntry[]
  total: number
}

// ─── Node ───

export interface NodeResponse {
  id: string
  tenant_id: string
  parent_id: string | null
  title: string
  // ``default_language`` is null on child nodes but guaranteed non-null on
  // root nodes (parent_id === null) by the backend's
  // ``course_nodes_root_language_required`` CHECK constraint (Task 2.4.13).
  description: string | null
  default_language: string | null
  order: number
  content_hash: string | null
  children_count: number
  authored_documents_count: number
  created_at: string
  updated_at: string
}

// Root nodes require ``default_language`` (Task 2.4.13). Stored canonical
// ISO 639-3; the API accepts any standard form (639-1 / 639-3 / English
// name) and normalizes server-side.
export interface RootNodeCreateData {
  title: string
  description?: string | null
  default_language: string
}

// Children remain optional — language is dead-data on the child; runtime
// inheritance reads only the root. Field kept for forward-compat.
export interface ChildNodeCreateData {
  title: string
  description?: string | null
  default_language?: string | null
}

export interface NodeTreeResponse {
  id: string
  parent_id: string | null
  title: string
  description: string | null
  order: number
  content_hash: string | null
  children: NodeTreeResponse[]
}

export interface AuthoredDocumentSummary {
  id: string
  course_node_id: string
  source_type: SourceType
  material_role: MaterialRole
  task_type: AssignmentType | null
  order: number
  filename: string | null
  source_url: string
  language: string | null
  state: DocumentState
  content_fingerprint: string | null
  error_message: string | null
  created_at: string
}

export interface NodeWithDocuments {
  id: string
  parent_id: string | null
  title: string
  description: string | null
  default_language: string | null
  order: number
  content_hash: string | null
  authored_documents: AuthoredDocumentSummary[]
  children: NodeWithDocuments[]
}

export interface NodeListResponse {
  items: NodeResponse[]
  total: number
  limit: number
  offset: number
}

// ─── Document ───

export interface AuthoredDocumentResponse {
  id: string
  course_node_id: string
  source_type: SourceType
  material_role: MaterialRole
  task_type: AssignmentType | null
  order: number
  filename: string | null
  source_url: string
  language: string | null
  state: DocumentState
  content_fingerprint: string | null
  raw_hash: string | null
  raw_size_bytes: number | null
  processed_hash: string | null
  processed_at: string | null
  pending_job_id: string | null
  pending_since: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

// ─── Job ───

export interface JobResponse {
  id: string
  job_type: string
  priority: string
  status: JobStatus
  queued_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

// ─── Cost (vision §3 KD5, post-0.7 contract) ───
//
// Tenant-wide cost summary. Backend always echoes resolved `from`/`to`
// (Tenant.created_at fallback for `from`, today UTC for `to`) so both
// fields are required on the wire. KD5 invariant:
//   total_usd == sum(by_course.cost_usd) + unattributed_cost_usd
// where `unattributed_cost_usd` aggregates ESCs whose Job has no
// course_node_id (orphan jobs).
//
// Drill-down (`CourseCostResponse`, `ByNodeEntry`, `ByActionEntry`) is
// out of scope for 0.UI — Phase 1+ task adds the per-course view and
// the corresponding types here. Keep this block minimal until then.

export interface ByCourseEntry {
  course_node_id: string
  course_title: string
  cost_usd: number
}

export interface ByProviderEntry {
  provider: string
  model_id: string
  cost_usd: number
}

export interface CostSummaryResponse {
  from: string
  to: string
  total_usd: number
  unattributed_cost_usd: number
  by_course: ByCourseEntry[]
  by_provider: ByProviderEntry[]
}
