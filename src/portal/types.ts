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
export type PortalSourceType = 'video' | 'presentation' | 'text' | 'web' | 'audio'

export interface PortalMaterialItem {
  id: string
  kind: PortalMaterialKind
  label: string
  source_type: PortalSourceType
  order: number
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

export interface PortalSubmissionListItem {
  id: string
  status: string
  score: number | null
  verdict: PortalVerdict | null
  created_at: string
  original_filename: string | null
}

// Detail adds the rendered review markdown (null until reviewed). Same curated
// slice otherwise — still no internal trace.
export interface PortalSubmissionDetail extends PortalSubmissionListItem {
  review_markdown: string | null
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
