// Wire types for the student portal (Phase 6 / T4b). Physically isolated
// from the author app's ``src/types/api.ts`` (ratify Q2): the portal is a
// separate SPA, its types live under ``src/portal/``. The single-source-of-
// type-truth discipline holds *within* each application, not across them.
//
// Mirrors the backend Pydantic schemas (``PortalLoginRequest`` /
// ``PortalLoginResponse`` / ``PortalMeResponse``); UUIDs cross the wire as
// strings.

export interface PortalLoginRequest {
  tenant_id: string
  login: string
  password: string
}

export interface PortalLoginResponse {
  access_token: string
  token_type: string
  student_id: string
  display_name: string | null
}

export interface PortalMe {
  student_id: string
  tenant_id: string
  login: string
  display_name: string | null
  // R3 (password-recovery): the recovery-email state feeding the home section.
  // ``recovery_email`` is null until the student sets one; ``confirmed`` flips
  // false → true only after the confirm-link is redeemed (changing the email
  // resets it to false).
  recovery_email: string | null
  recovery_email_confirmed: boolean
  // The language this student last asked a review in (ISO 639-3), null until
  // they ask for one. Written server-side on a submission that names a
  // language; served here so the submit form can open on the standing choice
  // instead of only remembering it (step Г2 §1.1).
  preferred_language: string | null
}

// Response of ``GET /api/v1/portal/languages`` — the whitelist the review-
// language field offers. Shape-identical to the author app's
// ``AllowedLanguagesResponse`` in ``src/types/api.ts``, and deliberately NOT
// imported from there: ``src/portal/`` is a separate entry with a separate
// client, and it imports nothing from the author's type file today. Reaching
// across would pull the author bundle's module graph into the portal for one
// interface.
export interface PortalLanguageEntry {
  code: string
  name_en: string
  // Optional in the contract and null for every entry the backend serves
  // today (the SIL table carries no native strings) — render ``name_en``.
  name_native: string | null
}

export interface PortalLanguagesResponse {
  items: PortalLanguageEntry[]
  total: number
}

// --- c2: materials-listing (T4a) + media descriptor (T3) ---
// Mirror the backend Portal* schemas verbatim. ``source_type`` crosses the
// wire as a free ``str``; we narrow to the documented union for the render
// matrix, but the material render is a TOTAL function with a default branch
// (corrective 1) so an unexpected value never yields an empty panel.

export interface PortalCourseListItem {
  id: string
  title: string
}

export interface PortalVerdict {
  passed: boolean
  correctness: string
}

export interface PortalAttemptResult {
  score: number | null
  verdict: PortalVerdict | null
}

// Coarse overlay bucket (T4a + DD-6-D de-collapse): the tree badge value. NOT
// the per-attempt raw lifecycle status (that crosses the wire as a free string
// on the read-path list/detail — 9 milestones, bucketed FE-side by
// ``statusBucket``). ``error`` = a terminal error (rejected/mismatch/failed),
// distinct from a reviewed-but-not-passed verdict.
export type PortalSubmissionStatus = 'none' | 'pending' | 'reviewed' | 'error'

export interface PortalSubmissionOverlay {
  submission_status: PortalSubmissionStatus
  last: PortalAttemptResult | null
  best: PortalAttemptResult | null
}

export type PortalMaterialKind = 'material' | 'task'
export type PortalSourceType = 'video' | 'presentation' | 'text' | 'web' | 'audio' | 'code'

// KD18 P5: the active base descriptor for a project task. ``state='ready'``
// describes the active (latest READY) version — the student may submit and
// ``snapshot_hash`` is the auto-echo source; ``pending`` / ``failed`` means the
// latest version is not usable yet (submit blocked, ``snapshot_hash`` null). A
// project task with NO base attached carries ``base = null`` on the item — a
// DISTINCT state (submit allowed, everything new), never a non-ready ``state``.
export type PortalTaskBaseState = 'pending' | 'ready' | 'failed'

export interface PortalTaskBase {
  version: number
  snapshot_hash: string | null
  state: PortalTaskBaseState
}

export interface PortalMaterialItem {
  id: string
  kind: PortalMaterialKind
  label: string
  source_type: PortalSourceType
  order: number
  // KD18 P5: assignment type (e.g. ``project``) when kind=task; null for a
  // material. ``base`` is the active base descriptor for a project task WITH a
  // base; null for a base-less project task, a non-project task, or a material.
  task_type: string | null
  base: PortalTaskBase | null
  overlay: PortalSubmissionOverlay | null
}

export interface PortalMaterialTreeNode {
  id: string
  title: string
  order: number
  documents: PortalMaterialItem[]
  children: PortalMaterialTreeNode[]
}

export type PortalMediaKind = 'external' | 'file' | 'slides'

export interface PortalMediaResponse {
  kind: PortalMediaKind
  url: string | null
  slide_urls: string[] | null
}

// KD18 P5: presigned download of a project task's active base ORIGINAL archive
// (GET /portal/tasks/{id}/base). Served on demand so the tree descriptor stays
// cheap — no presigned URL is baked into every task node (D2 option B). The
// active base is the latest READY version; a task with no READY base yields a
// distinct 404 ("No base is available for this task yet.").
export interface PortalBaseDownload {
  original_url: string
}

// --- c3a: submission act (POST /portal/tasks/{id}/submissions) ---
// Response is minimal (status 202): the submission id + lifecycle status, plus
// a duplicate flag — true when an identical file for this task was already
// submitted and terminal (no new attempt was created).

export interface PortalSubmitResponse {
  submission_id: string
  status: string
  duplicate: boolean
}

// --- c3b: read-path (own attempts list + review detail) ---
// Mirror the backend curated slice verbatim. ``status`` crosses the wire as the
// RAW lifecycle milestone (received / safety_ok / sanity_ok / reviewing /
// completed / delivered / rejected / mismatch / failed) — bucketed FE-side via
// ``statusBucket``. The internal trace (review_result beyond verdict /
// safety_result / sanity_result / error_message) is NEVER in the contract.

// Why an attempt was refused, and which of its files the checker did not read.
// Both are new with the submission-doors pass: the read-path used to carry the
// status alone, so the interface had to infer a "why" from it and could say
// nothing at all about files it had skipped inside an archive.
//
// ``code`` and ``reason`` stay free ``string`` and are deliberately NOT narrowed
// to a union of the codes known today. They are the backend's open vocabularies
// (every ``ErrorCategory`` value, plus the ``mismatch`` status), the phrase
// dictionaries are total by construction — an unknown key falls through to the
// next layer — and a union here would break the build on each new backend code
// while promising an exhaustiveness the wire does not actually have.
export interface PortalRejection {
  code: string
  // The short curated specific the phrase cannot know by itself — today the
  // original filename. NEVER the backend's internal message (DD-6-D).
  details: string | null
}

export interface PortalNotOpened {
  // Name of the file inside the archive.
  path: string
  // The same code vocabulary as ``PortalRejection``, so one dictionary serves
  // both surfaces.
  reason: string
  size: number
}

export interface PortalSubmissionListItem {
  id: string
  status: string
  score: number | null
  verdict: PortalVerdict | null
  created_at: string
  original_filename: string | null
  // Carried on the LIST item as well as the detail, so a refused attempt
  // explains itself from the row already in hand — the review detail's error
  // branch stays fetch-free (DD-6-D). ``not_opened`` is filled on a PASSING
  // attempt too: a review that quietly rested on part of the work is the thing
  // it exists to prevent.
  rejection: PortalRejection | null
  not_opened: PortalNotOpened[]
  // How the submitted file was read (step Г2 §1.2). Three values, three
  // different facts: ``utf-8`` (decoded directly — the ordinary case), another
  // encoding name (recovery established one and the review was written from
  // that reading), or null (the question does not apply — an archive recovers
  // its members individually, a document arrives already decoded). Carried on
  // the LIST row like ``not_opened``, because the error and pending branches of
  // the review detail render without fetching (DD-6-D).
  recovered_encoding: string | null
}

// KD18 P5: I2 delta receipt — counters + staleness for a project submission,
// derived on read (the DB stores manifests, not counts; compute_delta is
// BE-only). Null on the detail for a non-project submission (no delta concept),
// a DISTINCT state from an all-zero delta. ``is_stale`` is a signal, not a
// blocker (a newer READY base exists than the one built on). The hygiene level
// (normalizer-excluded new files) is deliberately NOT surfaced.
export interface PortalDeltaReceipt {
  changed: number
  new: number
  deleted: number
  base_version: number | null
  latest_version: number | null
  is_stale: boolean
}

// Detail adds the rendered review markdown (null until reviewed) and, for a
// project submission, the I2 delta receipt (null otherwise). Same curated
// slice otherwise — still no internal trace.
export interface PortalSubmissionDetail extends PortalSubmissionListItem {
  review_markdown: string | null
  delta: PortalDeltaReceipt | null
}

// --- R3: password-recovery self-service ---
// Mirror the shipped R2 backend schemas verbatim (verified against a fresh
// OpenAPI snapshot from backend main 0208b8e). Email validation is deliberately
// minimal on both ends (``@`` + non-empty domain, max 320) — the FE mirrors it,
// no strict RFC (RP6).

// Protected set/change of the recovery email (POST /portal/recovery-email).
export interface RecoveryEmailRequest {
  email: string
}

// The refreshed recovery-email state after a set/change (setting always resets
// ``recovery_email_confirmed`` to false and re-sends a confirm link).
export interface RecoveryEmailResponse {
  recovery_email: string
  recovery_email_confirmed: boolean
}

// Public confirm landing (POST /portal/recovery-email/confirm) → 204.
export interface ConfirmRecoveryEmailRequest {
  token: string
}

// Public forgot-password request (POST /portal/password/forgot) → always 202
// (anti-enumeration). Identifies the credential by (tenant, login) — email is
// not unique.
export interface ForgotPasswordRequest {
  tenant_id: string
  login: string
}

// Public reset (POST /portal/password/reset) → 204. ``token`` from the email
// link's query string; ``password`` is the new secret (min 10, weak → 422).
export interface ResetPasswordRequest {
  token: string
  password: string
}
