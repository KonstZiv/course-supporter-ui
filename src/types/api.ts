// ─── Enums ───

export type SourceType = 'video' | 'presentation' | 'text' | 'web' | 'audio' | 'code'
// The three states the server actually derives (backend ``MaterialState``:
// PENDING > READY > ERROR — orm.py). ``raw`` / ``integrity_broken`` were phantom
// UI-only values the wire never carries (deferred to Phase 2.x); narrowed
// 2026-08-06 (TASK-B §3 Б1) so the compiler forbids dead comparisons.
export type DocumentState = 'pending' | 'ready' | 'error'
export type MaterialRole = 'educational' | 'methodological'
export type AssignmentType = 'test' | 'short_task' | 'task' | 'project'

// Informational queue-wait hint on a successful intake (DD-3.3c-I-B). The UI
// localizes the surrounding copy; this carries only the numbers.
export interface ProcessingEstimate {
  max_hours: number
  check_after_hours: number
}
// ``cancelled`` is a valid ``queued → cancelled`` transition in the backend
// Job state machine (Task 3.2.5a; the pre-3.2.4 UI type was missing it).
// ``obsolete`` is the L2 execution-seam terminal for "subject vanished" (the
// material/node was soft-deleted while the job was in flight) — a benign
// terminal, distinct from a human-driven ``cancelled``.
export type JobStatus =
  | 'queued'
  | 'active'
  | 'complete'
  | 'failed'
  | 'cancelled'
  | 'obsolete'

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
  // The node-tree summary carries the derived phase (backend
  // AuthoredDocumentSummaryResponse), so lists/cards can show ``awaiting_author``
  // without fetching the full document. Unlike the detail response it does NOT
  // carry ``file_roles`` — the confirm screen fetches those separately.
  processing_phase: ProcessingPhase
  content_fingerprint: string | null
  error_message: string | null
  error_category: string | null
  created_at: string
}

// Methodist summary badge state surfaced per-node on the tree-feed
// (Task 3.2.5b commit-1): ``none`` (no summary), ``draft`` (generated, not
// yet approved), ``approved`` (author-approved).
export type SummaryStatus = 'none' | 'draft' | 'approved'

export interface NodeWithDocuments {
  id: string
  parent_id: string | null
  title: string
  description: string | null
  default_language: string | null
  order: number
  content_hash: string | null
  // Backend-computed badge state (Task 3.2.5b). Always present on the wire
  // (defaulted server-side); orthogonal to ``materials_changed``.
  summary_status: SummaryStatus
  // Axis-1 staleness ONLY: the node's materials changed after the summary
  // was generated (Raw.source_content_hash != CourseNode.content_hash). NOT
  // the generate-route's two-axis ``uncovered_stale`` — the label is
  // "materials changed", not "needs regeneration". Independent of
  // ``summary_status`` (an approved node can still be materials_changed).
  materials_changed: boolean
  authored_documents: AuthoredDocumentSummary[]
  children: NodeWithDocuments[]
}

export interface NodeListResponse {
  items: NodeResponse[]
  total: number
  limit: number
  offset: number
}

// ─── File roles (№21) ───

// External processing phase (L3 + №21): ``awaiting_author`` = prep produced a
// file-role proposal the author has not yet confirmed.
export type ProcessingPhase =
  | 'queued'
  | 'processing'
  | 'awaiting_author'
  | 'ready'
  | 'error'

export type FileRoleToken = 'full' | 'auxiliary' | 'structure_only'

export interface FileRoleProposalEntry {
  role: FileRoleToken
  reason: string
}

// The system's suggestion, written by the DOCUMENT_PREPARATION job.
export interface FileRoleProposal {
  files: Record<string, FileRoleProposalEntry>
  tree_digest: string
  computed_at: string
  // Files sanitization removed (safety + service dirs) — count only; the
  // author cannot restore them (decision 4). Absent on older proposals.
  removed?: { count: number }
}

// The author's confirmation, written by the confirm endpoint.
export interface FileRoleDecision {
  files: Record<string, FileRoleToken>
  tree_digest: string
  decided_at: string
}

export interface FileRoles {
  proposal?: FileRoleProposal
  decision?: FileRoleDecision
}

// POST /documents/{id}/file-roles body — full coverage of proposal.files.
export interface ConfirmFileRolesRequest {
  files: Record<string, FileRoleToken>
  tree_digest: string
}

// ─── Document ───

export interface AuthoredDocumentResponse {
  id: string
  course_node_id: string
  // Denormalised course root (A-BE-2). Backend column is NOT NULL, so this is
  // always present — never null. Equals course_node_id for a root-node document.
  course_root_id: string
  source_type: SourceType
  material_role: MaterialRole
  task_type: AssignmentType | null
  order: number
  filename: string | null
  source_url: string
  language: string | null
  state: DocumentState
  processing_phase: ProcessingPhase
  file_roles: FileRoles | null
  // Id of the Job currently processing this material, or null (wire field
  // ``job_id``). Full openapi resync: replaces the mistyped ``pending_job_id``
  // and the raw/processed hash block (content_fingerprint, raw_hash,
  // raw_size_bytes, processed_hash, processed_at, pending_since) — none of which
  // the response schema carries.
  job_id: string | null
  error_message: string | null
  error_category: string | null
  created_at: string
  updated_at: string
}

// ─── Project base (KD18 P6) ───
// The author-facing base archive attached to a ``task_type='project'`` document.
// Its normalization is the base's OWN lifecycle (pending → ready | failed),
// distinct from DocumentState — a dedicated union, not a reuse.

export type ProjectBaseState = 'pending' | 'ready' | 'failed'

// GET /documents/{id}/base — the LATEST version, ANY state (author monitoring
// of a fresh upload; get_latest, not latest-ready). ``failure_reason`` is
// non-null only for ``failed``; ``snapshot_hash`` is null until ``ready``.
export interface ProjectBaseStateResponse {
  version: number
  state: ProjectBaseState
  failure_reason: string | null
  snapshot_hash: string | null
}

// POST /documents/{id}/base — 202, normalization runs async (NO job_id;
// the FE polls GET /documents/{id}/base for pending → ready | failed).
export interface ProjectBaseAttachResponse {
  base_version_id: string
  version: number
  state: ProjectBaseState
}

// GET /documents/{id}/base/manifest — the typed P1 Manifest (DD-6-V). Fetched
// ONLY when state='ready' (the route is READY-only, 404 otherwise).
export type EntryClass = 'text' | 'document' | 'binary'
export type ExcludedReason = 'denylist_dir' | 'magic_mismatch' | 'nested_archive'

export interface ManifestEntry {
  path: string
  size: number
  hash: string
  cls: EntryClass
}

export interface ExcludedEntry {
  path: string
  reason: ExcludedReason
  entries: number
  size: number
}

export interface ProjectBaseManifest {
  schema: number
  aggregate_hash: string
  included: ManifestEntry[]
  excluded: ExcludedEntry[]
  total_files: number
  total_bytes: number
}

// ─── Job ───
//
// ``JobResponse`` is the full GET /jobs/{job_id} wrapper. The fields beyond
// the pre-3.2.4 set (tenant_id, course_node_id, arq_job_id, current_stage,
// stage_progress, result_data) landed across Phase 3.2.x. ``stage_progress``
// is generic JSONB on the wire (additionalProperties: true) — its shape
// depends on job_type. This UI's only ``JobResponse`` consumer is
// node_summary_regeneration polling (document-state polling uses a separate
// axis — ``nodesApi.getDetail``), so ``stage_progress`` is typed as the
// summary run-state shape below.

export interface JobResponse {
  id: string
  job_type: string
  priority: string
  status: JobStatus
  tenant_id: string | null
  course_node_id: string | null
  arq_job_id: string | null
  // The active pass — 'bottomup' / 'topdown' / null when the run is not
  // executing. Completion is signalled by ``status='complete'``, never by a
  // ``current_stage`` sentinel (backend invariant).
  current_stage: string | null
  stage_progress: NodeSummaryRunState | null
  result_data: Record<string, unknown> | null
  error_message: string | null
  error_category: string | null
  queued_at: string
  started_at: string | null
  completed_at: string | null
}

// ─── Author work-list (step A) ───
//
// Two read-only doors over one query layer: GET /api/v1/jobs (flat list) and
// GET /api/v1/jobs/history (grouped by material). Author scope only. The flat
// door feeds the activity strip (step В, useActivityStrip); the history door is
// not yet consumed (step Г). Types stay synced to the server per the
// contract-drift discipline (vision-rules#18).

// The work-state axis of a Job ROW (step A §3): derived purely from the backend
// Job.status. Distinct from ProcessingPhase (a MATERIAL axis) — a job row never
// carries ``awaiting_author``. Live tokens ('queued' / 'processing') match the
// material phase words verbatim; terminals are outcome words.
export type JobState =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'error'
  | 'cancelled'
  | 'obsolete'

// The four job kinds the doors ever return (homework_processing / s3_cleanup are
// never author-facing and cannot appear).
export type AuthorJobType =
  | 'document_processing'
  | 'document_preparation'
  | 'node_summary_regeneration'
  | 'base_normalize'

// Door-1 ``state_class`` query filter (backend ``Literal["in_flight","at_rest"]``):
// narrows the flat list to live work or to finished work. Omitted → both.
export type StateClass = 'in_flight' | 'at_rest'

// One row of door 1; also the ``last_job`` of a history row (door 2).
export interface JobListItemResponse {
  id: string
  job_type: AuthorJobType
  job_state: JobState
  queued_at: string
  // Worker-pickup time; null for work terminated straight from the queue.
  started_at: string | null
  completed_at: string | null
  subject_type: string | null
  subject_id: string | null
  // Resolved material anchor; null for node-summary work.
  material_id: string | null
  // Material label as stored — a scrubbed marker for a deleted source; the
  // server neither invents nor hides it.
  display_name: string | null
  display_deleted: boolean
  display_deleted_at: string | null
  // Source type (document work only), for the deleted marker.
  material_source_type: SourceType | null
  // Base-archive version (base-normalize work only).
  base_version: number | null
  current_stage: string | null
  // Progress checkpoint as stored — polymorphic by job_type (frame-progress for
  // video ingestion, run-state for node summary); a later step narrows the shape.
  stage_progress: Record<string, unknown> | null
}

export interface JobListResponse {
  items: JobListItemResponse[]
  total: number
  limit: number
  offset: number
}

// One row of door 2 — a material with its work history (grouped server-side).
export interface MaterialHistoryItemResponse {
  material_id: string
  display_name: string | null
  material_deleted: boolean
  material_deleted_at: string | null
  material_source_type: SourceType | null
  // The material's real processing phase; null when the material is deleted
  // (a deleted material is a marker, not a phase).
  processing_phase: ProcessingPhase | null
  last_job: JobListItemResponse
  jobs_count: number
}

export interface MaterialHistoryResponse {
  items: MaterialHistoryItemResponse[]
  total: number
  limit: number
  offset: number
}

// ─── NodeSummary run-state (Job.stage_progress for node_summary_regeneration) ───
//
// Mirrors backend ``storage/node_summary_run_state.py`` (Pydantic). That
// module is the source of truth: the OpenAPI snapshot types stage_progress as
// opaque ``object`` and cannot drive these shapes (probe 2026-06-13).

// Per-node lifecycle status inside a run (backend NodeSummaryNodeStatus).
// Five values: 'not_applicable' = pass is exempt by construction (Pass 2 on
// the course root); 'skipped_memo' = hash key matched, LLM hook not invoked.
export type NodeSummaryNodeStatus =
  | 'pending'
  | 'done'
  | 'skipped_memo'
  | 'not_applicable'
  | 'error'

// Severity drives UI rendering EXCLUSIVELY (DD-3.2.2-B): 'ERROR' = anomaly
// (alert style); 'WARNING' = expected-by-design (e.g. force-bypass of
// uncovered_stale) — rendered muted, never an alert.
export type RunErrorSeverity = 'WARNING' | 'ERROR'

// Machine-readable category. UI does NOT interpret this — only ``severity``
// controls style; listed for reference / future diagnostics. ``null`` on
// catch sites without a parent-Raw discriminator.
export type RunErrorClass =
  | 'parent_intentionally_out_of_run_scope'
  | 'parent_summary_missing_within_scope'
  | 'parent_node_missing_from_database'

// A single per-node error (the append-only ``errors[]``). Liberal by design:
// the backend model carries ``extra='allow'`` so forward-schema additions on
// future tasks must not break reads — the index signature mirrors that. UI
// shows ``reason`` verbatim (human text, never parsed for logic).
export interface NodeSummaryRunError {
  node_id: string
  stage: 'bottomup' | 'topdown'
  reason: string
  at: string
  severity: RunErrorSeverity
  error_class: RunErrorClass | null
  [key: string]: unknown
}

export interface NodeSummaryRunScope {
  in_scope_node_ids: string[]
  uncovered_stale_node_ids: string[]
}

// Top-level shape persisted under ``Job.stage_progress``. ``errors`` is the
// top-level append-only list — NOT nested under pass1/pass2 (those are
// per-node status maps keyed by CourseNode id).
export interface NodeSummaryRunState {
  vertex_node_id: string
  force: boolean
  scope: NodeSummaryRunScope
  pass1: Record<string, NodeSummaryNodeStatus>
  pass2: Record<string, NodeSummaryNodeStatus>
  errors: NodeSummaryRunError[]
  started_at: string
  updated_at: string
}

// ─── POST /api/v1/nodes/{node_id}/summary/generate ───
//
// Request body; ``force`` widens only the API's 422 decision on
// uncovered_stale (memo-skip is unconditional in the orchestrator). Response
// is 202 with a full ``JobResponse`` — render starts from it, then polls
// GET /jobs/{job_id}.
export interface NodeSummaryGenerateRequest {
  force?: boolean
}

// 422 body on /generate (force=false + stale CourseNodes outside the vertex
// subtree). Discriminated union on ``reason`` — narrow by EXACT value, never
// by field presence: ``not_yet_generated`` shares the shape family on sibling
// summary routes (P6 GET, consumed in 3.2.5b). Read via ``ApiError.body``.
export interface UncoveredStaleNodesDetail {
  reason: 'uncovered_stale_nodes'
  uncovered_stale_node_ids: string[]
  hint: string
}

export interface NotYetGeneratedDetail {
  reason: 'not_yet_generated'
}

export type SummaryErrorDetail =
  | UncoveredStaleNodesDetail
  | NotYetGeneratedDetail

// ─── NodeSummaryFinal review/edit contract (P6 GET / edit-view / PATCH) ───
//
// Task 3.2.5b. Success-contract shapes mirror the backend OpenAPI snapshot
// from main (c05b11b). Error-envelope forms are NOT taken from the snapshot
// (app.openapi() serializes them opaquely — generic object / HTTPValidationError);
// they are the runtime forms confirmed by live curl this session (consumed in
// c3/c4, never read via ``body.reason`` directly — KD-D 3.2.5a):
//   * PATCH 422 has TWO forms: pydantic extra-forbid array
//     ``{detail: [{loc, msg, type}]}`` (non-editable key) AND manual string
//     ``{detail: "No editable fields supplied in PATCH body."}`` (empty body).
//   * P6 GET 404 differs by ``detail`` form: generic string
//     ``{detail: "Node not found"}`` vs object ``{detail: {reason: "not_yet_generated"}}``.

// Object-array item for ``knowledge`` / ``skills``. The snapshot types these
// loosely as ``Record<string, string>`` (open additionalProperties), but the
// ratified surface + the c4 pair-editor (which owns the write shape the UI
// produces) fix them as {name, description}; tightened deliberately. Distinct
// from ``previous_snapshot`` below, which the UI only reads and so stays loose.
export interface LearningOutcomeItem {
  name: string
  description: string
}

// GET /api/v1/nodes/{node_id}/summary (P6, 200 branch); also edit-view.final
// and the 200 body of PATCH / approve / accept-raw.
export interface NodeSummaryFinal {
  id: string
  course_node_id: string
  // Editable family (10) — KD11 §1043-1054.
  title: string | null
  description: string | null
  learning_objectives: string[]
  knowledge: LearningOutcomeItem[]
  skills: LearningOutcomeItem[]
  success_criteria: string[]
  assessment_approach: string | null
  teaching_approach: string | null
  key_activities: string[]
  common_mistakes: string[]
  // Read-only — copied from Raw (KD11). Rendered verbatim, never edited,
  // never transformed (concept = bilingual search key, §4).
  main_concepts: string[]
  secondary_concepts: string[]
  enclosing_context: string | null
  // Forward-compat empty-leaf author flow (no UI flow sets these in 3.2.5b).
  is_manual: boolean
  manual_description: string | null
  // Size metrics (read-only).
  own_documents_count: number
  own_chars_count: number
  cumulative_documents_count: number
  cumulative_chars_count: number
  // Hash + approval pair. approved_at and enclosing_context_updated_at are
  // TWO independent timestamps — never assume the whole Final was approved
  // at one moment (KD11 §1069).
  content_hash: string | null
  approved_at: string | null
  enclosing_context_updated_at: string | null
  created_at: string
  updated_at: string
}

// GET /api/v1/node-summaries/{node_id}/edit-view (200).
export interface NodeSummaryEditView {
  final: NodeSummaryFinal
  // API alias for NodeSummaryRaw.methodist_observations — shown before approve.
  raw_observations: string[]
  // Snapshot of the prior Final captured at the last automatic overwrite;
  // ``null`` when no overwrite has occurred yet. Backend emits it as an
  // untyped dict (a possibly-older schema's Final), so it is INTENTIONALLY a
  // loose map — never typed as NodeSummaryFinal (false confidence). The diff
  // (c5) reads it defensively.
  previous_snapshot: Record<string, unknown> | null
}

// PATCH /api/v1/node-summaries/{node_id}/final — editable family only
// (server ``extra='forbid'``). All keys optional; Save sends ONLY changed
// keys (partial PATCH). The UI never sends non-editable keys (concepts /
// enclosing_context / hash / timestamps / is_manual).
export interface NodeSummaryFinalUpdate {
  title?: string | null
  description?: string | null
  learning_objectives?: string[] | null
  knowledge?: LearningOutcomeItem[] | null
  skills?: LearningOutcomeItem[] | null
  success_criteria?: string[] | null
  assessment_approach?: string | null
  teaching_approach?: string | null
  key_activities?: string[] | null
  common_mistakes?: string[] | null
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

// ─── Homework cost-attribution (Phase 6, 6.HC — DD-6-I Variant A) ───
//
// A cross-section separate from /cost/summary. Homework Jobs carry
// course_node_id=NULL, so their cost lands in summary's
// `unattributed_cost_usd` bucket and is attributed here instead. Drilled
// on demand as a 3-level tree, each level a request keyed by the parent:
//   L1 /cost/homework → L2 .../course/{id} → L3 .../task/{id}.
// The task total (L4) is a row in the L2 response — there is no standalone
// task-aggregate endpoint.
//
// A NEW type set, NOT an extension of `CostSummaryResponse`: the L1 shape
// has no `unattributed_cost_usd` / `by_provider`, and the breakdowns add
// `is_deleted` (soft-deleted task, shown not hidden) / `task_label`
// (backend-composed) / `student_display` (backend-composed fallback —
// display_name → login → external_id; the FE renders it verbatim).
// Shapes verified against the backend `main` OpenAPI snapshot at the
// 6.HC-UI pre-flight.

export interface HomeworkByCourseEntry {
  course_node_id: string
  course_title: string
  cost_usd: number
}

export interface HomeworkByTaskEntry {
  authored_document_id: string
  task_label: string
  is_deleted: boolean
  cost_usd: number
}

export interface HomeworkByStudentEntry {
  student_id: string
  student_display: string
  cost_usd: number
}

export interface HomeworkCostResponse {
  from: string
  to: string
  total_usd: number
  by_course: HomeworkByCourseEntry[]
}

export interface HomeworkCourseCostResponse {
  course_node_id: string
  from: string
  to: string
  by_task: HomeworkByTaskEntry[]
}

export interface HomeworkTaskCostResponse {
  authored_document_id: string
  from: string
  to: string
  by_student: HomeworkByStudentEntry[]
}

// --- Phase 6 T5: tenant-admin student management (author app) ---
// Mirrors the backend 7-route contract (5 write T1 + 2 read T5-BE). Diffed
// against the OpenAPI snapshot from backend main. Course roots for the bind
// picker reuse the existing NodeResponse / NodeListResponse (nodesApi).

export interface StudentRosterItem {
  student_id: string
  external_id: string
  // login / is_active are null for integration-mode students that never got
  // a portal credential (LEFT join). is_active mirrors the revoke state
  // (DD-6-A): null = no credential, true = active, false = access revoked.
  login: string | null
  display_name: string | null
  is_active: boolean | null
  enrollment_count: number
}

export interface StudentRosterResponse {
  // DD-6-M: the tenant these students belong to, so the author UI can build the
  // shared portal link `${VITE_PORTAL_ORIGIN}/${tenant_id}/login` without
  // exposing the UUID elsewhere. Present even at 0 courses.
  tenant_id: string
  items: StudentRosterItem[]
  total: number
  limit: number
  offset: number
}

export interface StudentEnrollmentItem {
  course_node_id: string
  enrolled_at: string
}

export interface StudentEnrollmentsResponse {
  student_id: string
  items: StudentEnrollmentItem[]
}

export type ProvisionMode = 'generate' | 'manual' | 'existing'

export interface ProvisionStudentRequest {
  mode: ProvisionMode
  // Cross-field (validated client-side before POST, mirrors the backend
  // model_validator): manual → external_id required; existing → student_id
  // required; generate → external_id omitted.
  external_id?: string | null
  student_id?: string | null
  login: string
  password: string
  display_name?: string | null
}

export interface ProvisionStudentResponse {
  student_id: string
  external_id: string
  login: string
}

// DD-6-J author-side password reset (fallback path). Schema floor only — the
// real minimum-length policy is enforced backend-side at hash time (a weak
// password maps to 422), exactly as provisioning does.
export interface SetStudentPasswordRequest {
  password: string
}

export interface EnrollmentRequest {
  student_id: string
  course_node_id: string
}
