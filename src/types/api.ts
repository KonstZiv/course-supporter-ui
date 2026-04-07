// ─── Enums ───

export type SourceType = 'video' | 'presentation' | 'text' | 'web'
export type MaterialState = 'raw' | 'pending' | 'ready' | 'integrity_broken' | 'error'
export type GenerationMode = 'free' | 'guided'
export type ValidationState = 'validated' | 'pending_validation' | 'validation_failed'
export type MaterialRole = 'educational' | 'methodological'
export type JobStatus = 'queued' | 'active' | 'complete' | 'failed'

// ─── Node ───

export interface NodeResponse {
  id: string
  tenant_id: string
  parent_id: string | null
  title: string
  description: string | null
  order: number
  node_fingerprint: string | null
  children_count: number
  materials_count: number
  created_at: string
  updated_at: string
}

export interface NodeTreeResponse {
  id: string
  parent_id: string | null
  title: string
  description: string | null
  order: number
  node_fingerprint: string | null
  children: NodeTreeResponse[]
}

export interface MaterialEntrySummary {
  id: string
  node_id: string
  source_type: SourceType
  material_role: MaterialRole
  order: number
  filename: string | null
  source_url: string
  state: MaterialState
  content_fingerprint: string | null
  error_message: string | null
  created_at: string
}

export interface NodeWithMaterials {
  id: string
  parent_id: string | null
  title: string
  description: string | null
  order: number
  node_fingerprint: string | null
  materials: MaterialEntrySummary[]
  children: NodeWithMaterials[]
}

export interface NodeListResponse {
  items: NodeResponse[]
  total: number
  limit: number
  offset: number
}

// ─── Material ───

export interface MaterialEntryResponse {
  id: string
  node_id: string
  source_type: SourceType
  order: number
  filename: string | null
  source_url: string
  state: MaterialState
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

// ─── Generation ───

export interface GenerationPlanResponse {
  snapshot_id?: string
  job_id?: string
  status: string
  message: string
}

export interface StructureNode {
  id: string
  node_type: string
  order: number
  title: string
  description: string | null
  learning_goal: string | null
  difficulty: string | null
  estimated_duration: number | null
  key_concepts: Array<Record<string, string>> | null
  children: StructureNode[]
}

export interface SnapshotDetailResponse {
  id: string
  materialnode_id: string
  mode: GenerationMode
  node_fingerprint: string
  created_at: string
  structure: Record<string, unknown>
  structure_tree?: StructureNode[]
}

// ─── Editable ───

export interface EditableNodeResponse {
  id: string
  materialnode_id: string
  source_snapshot_id: string | null
  source_structurenode_id: string | null
  node_type: string
  order: number
  title: string
  description: string | null
  learning_goal: string | null
  expected_knowledge: Array<Record<string, string>> | null
  expected_skills: Array<Record<string, string>> | null
  prerequisites: string[] | null
  difficulty: string | null
  estimated_duration: number | null
  success_criteria: string | null
  assessment_method: string | null
  competencies: string[] | null
  key_concepts: Array<Record<string, string>> | null
  common_mistakes: string[] | null
  teaching_strategy: string | null
  activities: string[] | null
  teaching_style: string | null
  deep_dive_references: Array<Record<string, unknown>> | null
  timecodes: Array<Record<string, unknown>> | null
  slide_references: Array<Record<string, unknown>> | null
  web_references: Array<Record<string, unknown>> | null
  edited_fields: string[]
  children: EditableNodeResponse[]
  created_at: string
  updated_at: string
}

export interface EditableTreeResponse {
  materialnode_id: string
  source_snapshot_id: string | null
  nodes: EditableNodeResponse[]
}

export interface EditableNodeUpdateRequest {
  title?: string
  description?: string | null
  learning_goal?: string | null
  expected_knowledge?: Array<Record<string, string>> | null
  expected_skills?: Array<Record<string, string>> | null
  prerequisites?: string[] | null
  difficulty?: string | null
  estimated_duration?: number | null
  success_criteria?: string | null
  assessment_method?: string | null
  competencies?: string[] | null
  key_concepts?: Array<Record<string, string>> | null
  common_mistakes?: string[] | null
  teaching_strategy?: string | null
  activities?: string[] | null
  teaching_style?: string | null
  deep_dive_references?: Array<Record<string, unknown>> | null
  timecodes?: Array<Record<string, unknown>> | null
  slide_references?: Array<Record<string, unknown>> | null
  web_references?: Array<Record<string, unknown>> | null
}

// ─── Reconciliation ───

export type ReconciliationIssueType = 'contradiction' | 'gap' | 'overlap' | 'inconsistency'

export interface ReconciliationIssue {
  id: string
  editable_node_id: string
  node_title: string
  field: string
  issue_type: ReconciliationIssueType
  description: string
  current_value: unknown
  suggested_value: unknown
  reasoning: string
}

export interface ReconciliationPreviewResponse {
  issues: ReconciliationIssue[]
  context_summary: string
}

export interface ReconcileApplyRequest {
  accepted_issue_ids: string[]
  issues: ReconciliationIssue[]
}

export type ReconciliationFreshness =
  | 'fresh'
  | 'stale_materials'
  | 'stale_edited'
  | 'stale_both'
  | 'none'

export interface ReconciliationStatusResponse {
  has_preview: boolean
  preview: ReconciliationPreviewResponse | null
  freshness: ReconciliationFreshness
  job_id: string | null
  job_status: string | null
}

// ─── Cost Report ───

export interface CostReport {
  summary: {
    total_calls: number
    successful_calls: number
    failed_calls: number
    total_cost_usd: number
    total_tokens_in: number
    total_tokens_out: number
  }
}
