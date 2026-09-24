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
  // What the language calls itself. The backend reads these from CLDR and
  // serves one for every language on its list; the type stays nullable
  // because the contract allows null, and ``name_en`` is the fallback.
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

// What to SAY about an attempt (mentor-rebuild task 03). The server's single
// answer, carried identically by the tree, the attempts list and the detail —
// so the interface no longer keeps its own copy of the rule and the three can
// no longer phrase the same attempt differently (DD-SP-AS).
//
// Five states, because that is how many different things a student can be told.
// Which of the ten stored lifecycle milestones it was is internal and stays so
// — the raw ``status`` still crosses the wire for whoever already reads it, but
// nothing in the portal decides anything from it any more.
export type PortalPresentationState =
  | 'not_opened'
  | 'not_an_attempt'
  | 'awaiting_funds'
  | 'in_progress'
  | 'reviewed'

export interface PortalPresentation {
  state: PortalPresentationState
  // A service key, not a sentence: this side picks the words. Null where the
  // state is the whole answer.
  reason_code: string | null
}

export interface PortalSubmissionOverlay {
  submission_status: PortalSubmissionStatus
  // The same answer the attempts list carries for the LATEST attempt. Null when
  // there are no attempts. Beside ``submission_status``, never instead of it —
  // the old bucket stays on the wire until DD-SP-AS retires it.
  presentation: PortalPresentation | null
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
  // Task 07 (DD-SP-BD): true when this task is a test answered with the test
  // form — the questions of ``GET /portal/tasks/{id}/test`` instead of a file
  // upload. Optional on purpose: a backend from before task 07 does not send
  // it, and the file form must then stay. The server sends ``false`` for every
  // other document, and for a test while tests are still answered with a file.
  test_form?: boolean
}

export interface PortalMaterialTreeNode {
  id: string
  title: string
  order: number
  // Step Д: the COURSE language (ISO 639-3), set on the ROOT of the tree and
  // null on every child. Not a per-node value — a child's own column is
  // nullable dead data server-side, so the backend deliberately projects null
  // there rather than inviting "this section has no language". Read at the
  // root by the submission form, which is the only consumer.
  default_language: string | null
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

// --- Task 07: a test answered with its answers ---
// Mirrored verbatim against a fresh OpenAPI snapshot of backend main
// (``5004d75``), identical to the live contract. The structure route carries
// nothing of the key — not the right options, not how many there are, no
// explanation — so no field here could show one.

// One option of a question, as the test prints it.
export interface TestStructureOption {
  label: string
  text: string
}

// One question, with its options in the order the test lists them.
export interface TestStructureQuestion {
  number: string
  text: string
  options: TestStructureOption[]
}

// GET /portal/tasks/{id}/test. ``version`` goes back as ``test_version`` with
// the answers. ``accepting_answers`` is false while tests are still answered
// with a file, or while the author's key does not apply to this version: the
// test can be read then, but not answered.
export interface TestStructureResponse {
  version: string
  accepting_answers: boolean
  questions: TestStructureQuestion[]
}

// POST /portal/tasks/{id}/test-submissions → 202 with ``PortalSubmitResponse``.
// ``answers`` maps a question number to the labels ticked; a question left out
// is not refused, it counts as answered wrong. Without ``test_version`` the
// answers are taken for the current version; a stale one is refused with
// ``TEST_VERSION_CHANGED``. The same answers sent twice are two attempts.
export interface PortalTestSubmitRequest {
  answers: Record<string, string[]>
  test_version?: string | null
  response_language?: string | null
  student_note?: string | null
}

// A door's refusal, as it crosses the wire: FastAPI nests an HTTPException's
// detail under ``detail``, and a door that names its reason puts this OBJECT
// there, where other refusals put a string. ``code`` is what the portal picks
// its words by; ``details`` is the server's English fallback and is never
// shown to a student (DD-SP-D).
export interface PortalDoorRefusal {
  code: string
  details: string | null
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
  // What to say about this attempt (mentor-rebuild task 03), beside ``status``
  // and never instead of it.
  presentation: PortalPresentation
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
  structure: ReviewStructureV1 | null
  delta: PortalDeltaReceipt | null
  own_feedback: FeedbackTouch | null
}

// --- What the student says about a review (mentor-rebuild task 05) ---
// Mirrored verbatim against a fresh OpenAPI snapshot of the backend branch.
// Both vocabularies are CLOSED on the server: a third value would arrive as a
// string this build does not know, so the narrow types are the contract and not
// a convenience.

export type FeedbackKind = 'touch'
export type FeedbackValue = 'helped' | 'not_helped'

// The answer as the server serves it back — from the touch route itself and,
// on the next read, from the submission detail. One shape for both, which is
// why the server's model is not named after either surface.
//
// ``updated_at`` is the time of the CURRENT answer: a repeat touch replaces the
// previous one rather than adding a second, and the time moves with it.
export interface FeedbackTouch {
  kind: FeedbackKind
  value: FeedbackValue
  updated_at: string
}

// The body of a touch from the portal. ``kind`` is sent although the vocabulary
// has one member: the server spells it out for the same reason, and a body that
// omits it today would have to start naming it the day a second kind arrives.
export interface PortalTouchRequest {
  kind: FeedbackKind
  value: FeedbackValue
}

// --- The review as data (mentor-rebuild task 04) ---
// Mirrors the backend models verbatim against a fresh OpenAPI snapshot. No
// screen reads these yet: the review is still shown as ``review_markdown``,
// and building the page out of the structure is a later task. They are here
// because the contract carries them, and a type that lags the contract is how
// a field arrives unnoticed.
//
// ``structure`` is null on a review written before the rebuild and on every
// review but a test's: since task 07 a test's review carries one, with its
// ``test`` section, and no other stage writes one yet.

// Where in the material a remark points. The four kinds are closed on the
// server; a fifth would arrive as a string this build does not know.
export type ReviewPositionKind = 'video' | 'slide' | 'paragraph' | 'file'

export interface ReviewPosition {
  kind: ReviewPositionKind
  value: string
}

// Something to read, already resolved to a link by the server.
export interface ReviewReference {
  title: string
  url: string
}

// One remark, in the contrasting form: what is wrong, why it matters, what to
// do, where to read. The first three are always present.
export interface ReviewRemark {
  what: string
  why: string
  todo: string
  read: ReviewReference[]
  position: ReviewPosition | null
}

export type ReviewReplyKind = 'question' | 'objection' | 'comment'

export interface ReviewReply {
  kind: ReviewReplyKind
  said: string
  answer: string
}

// ``why`` is null on a test's verdict — the score is its reason (task 07,
// decision 20); every other verdict carries one.
export interface ReviewVerdict {
  passed: boolean
  why: string | null
}

// What was established by running the work, and what by reading it. Either
// list may be empty, but the server refuses a section where both are.
export interface ReviewVerification {
  by_run: string[]
  by_reading: string[]
}

// A test's result, question by question (task 07). A right answer is its
// verdict alone; a wrong one adds the correct options as the student saw them
// and the explanation shown — null when there is none.
export interface ReviewTestOption {
  label: string
  text: string
}

export interface ReviewTestQuestion {
  number: string
  correct: boolean
  correct_answer: ReviewTestOption[] | null
  explanation: string | null
}

// ``explanations_in_course_language`` is true when an explanation shown is in
// the course language rather than the review's; ``retry_offer`` when the pass
// mark was missed.
export interface ReviewTestSection {
  score: number
  questions: ReviewTestQuestion[]
  explanations_in_course_language: boolean
  retry_offer: boolean
}

// The whole review. ``language`` is the ISO 639-3 code it is written in, and
// it is part of the review rather than something the reader chooses.
export interface ReviewStructureV1 {
  schema_version: string
  language: string
  verdict: ReviewVerdict | null
  test: ReviewTestSection | null
  fixed: ReviewRemark[]
  new_remarks: ReviewRemark[]
  open: ReviewRemark[]
  broken: ReviewRemark[]
  mentor_voice: string | null
  replies: ReviewReply[]
  verification: ReviewVerification | null
  progress: string | null
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


// --- Step Д: submission policy (DD-SP-V) ---
// What the submission door accepts, served by GET /portal/submission-policy so
// the form stops carrying copies of it. Three facts, one per gate the server
// runs, in the order a submission meets them.
//
// ``PortalAssignmentType`` is declared here rather than imported from the
// author bundle's ``AssignmentType``: the two applications share no types by
// ratified design (see the header of this file), and ``PortalSourceType``
// already sets the precedent for a portal-local twin of an author union.
export type PortalAssignmentType = 'test' | 'short_task' | 'task' | 'project'

export interface SubmissionPolicyEntry {
  // Upload cap in bytes, exactly as the server compares it.
  max_bytes: number
  // Allowed extensions, dot-prefixed and sorted — the form of the HTML
  // ``accept`` attribute, which is why nothing reshapes them here.
  accept: string[]
  // Whether the whole project must arrive as one archive; a loose file is
  // refused server-side with ``ARCHIVE_ONLY``.
  archive_only: boolean
}

export interface SubmissionPolicyResponse {
  // One entry per assignment kind — all four, not the two the server branches
  // on, so the form looks its own ``task_type`` up instead of re-deriving
  // "project or not" on this side of the boundary.
  policies: Record<PortalAssignmentType, SubmissionPolicyEntry>
}
