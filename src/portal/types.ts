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

export type PortalSubmissionStatus = 'none' | 'pending' | 'reviewed'

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
