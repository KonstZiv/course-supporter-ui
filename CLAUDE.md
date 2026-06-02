# course-supporter-ui (frontend) — Claude Code context

Before working in this repo, read `../CLAUDE.md` (workspace-level). The three non-negotiable rules apply here too.

## What this project is — target state

React + TypeScript SPA for:
- Authoring: course tree management, material upload, pipeline monitoring.
- NodeSummary editing: reviewing Raw observations, editing Final, approve/accept-raw actions, seeing previous-version diffs.
- Cost monitoring: per-tenant dashboard.
- Homework review: (future) viewing submission history per student.

**Target state is in `../refactoring-vision/vision.md` §5 Stage map** — specifically the `.UI` sub-stages in each Phase.

## Stack

- React 19 + TypeScript
- Vite (build), Tailwind (styling)
- Zustand (state), React Flow via `@xyflow/react` (course tree canvas)
- React Router v6
- API client: `fetch` wrapped in `src/api/client.ts`, auth via `X-API-Key` header

## Commands

```bash
npm install
npm run dev            # vite dev server
npm run build          # tsc + vite build
npm run lint           # eslint
```

## Rules specific to frontend

### API contract is the integration point

Every backend sub-stage that changes API surface triggers a matching UI sub-stage. The contract is **not** maintained as a hand-written file in the repository. The canonical source is the OpenAPI specification that FastAPI generates from the backend `app` object; the running server exposes it at `/openapi.json`.

When a UI task consumes a changed API, generate a one-off snapshot from the **current backend `main`** (not from a deployed `/openapi.json` — staging lags behind manual deploys):

```bash
uv run python -c "import json,sys; from course_supporter.api.app import app; sys.stdout.write(json.dumps(app.openapi(), ensure_ascii=False, indent=2))" > /tmp/cs-openapi-snapshot.json
```

Workflow:

1. Before touching `src/types/api.ts` or `src/api/*.ts`, generate the snapshot (command above). The snapshot is always fresh against the `main` the UI is working against.
2. Update `src/types/api.ts` (schema types) and the corresponding `src/api/*.ts` module (endpoint calls) **by hand**, diffing against the snapshot. There is no auto-generation step — a deliberate choice; tooling for codegen is a separate future consideration.
3. Components that consume those types adapt.
4. Integration tests run against the updated contract (the backend test suite, not the snapshot).
5. **Delete the snapshot after the type sync is done** (`rm /tmp/cs-openapi-snapshot.json`). Never commit it. Versioning a snapshot would reintroduce exactly the drift problem this workflow eliminates — the source of truth is backend code.

**Do not change types in `src/types/api.ts` speculatively** without a fresh snapshot to diff against. Backend drift into UI is a frequent cause of bugs.

### Legacy UI that will be removed in Phase 5

The following are **scheduled for deletion** as part of Phase 5 cleanup. Do not extend them; do not create new usages of them. You may read them for context only.

- `src/components/reconciliation/` — entire folder (IssueCard, ReconciliationPanel, ReconciliationSummary).
- `src/api/reconciliation.ts` — entire file.
- `src/api/generation.ts` — entire file (old ArchitectAgent trigger).
- `src/stores/reconciliation.ts` — entire file.
- Types in `src/types/api.ts`: `ReconciliationIssue*`, `ReconciliationFreshness`, `ReconciliationPreviewResponse`, `ReconciliationStatusResponse`, `GenerationPlanResponse`, `StructureNode`, `SnapshotDetailResponse`, `EditableNode*` (entire block including all legacy fields).

### Legacy UI that will be rewritten

- `src/api/editable.ts` → rewritten as `src/api/node-summary.ts` (Phase 3.3) with new endpoints: `edit-view`, `approve`, `accept-raw`, `PATCH /final`.
- `src/api/materials.ts` → rewritten as `src/api/documents.ts` (Phase 1): endpoint path changes from `/nodes/{id}/materials` to `/nodes/{id}/documents`, `MaterialEntry` types replaced by `AuthoredDocument`.
- `src/api/methodist.ts` → rewritten (Phase 3.2) for new two-pass bottom-up/top-down trigger.
- `src/api/reports.ts` → expanded as `src/api/cost.ts` (Phase 0.UI) with `/cost/summary` and `/cost/course/{id}`.
- `src/components/structure/EditableField.tsx`, `EditableNodeCard.tsx`, `EditableNodeModal.tsx`, `EditableTree.tsx`, `MethodistPanel.tsx` — ~900 lines, rewritten in Phase 3.3 for the new NodeSummaryFinal contract (11 editable fields, read-only concepts, observation panel, approve/accept-raw, previous-snapshot diff).

### Legacy UI that stays roughly as-is

- `src/components/flow/*` — React Flow canvas. Needs term rename (material → document), otherwise structurally intact.
- `src/components/ui/*`, `src/components/layout/*` — minimal changes.
- `src/pages/LoginPage.tsx` — no changes expected.

### Types file is the single source of type truth

`src/types/api.ts` is the canonical place for all response/request types. Keep it aligned with the backend's Pydantic schemas — generate a fresh OpenAPI snapshot from backend `main` and diff against it (see "API contract is the integration point" above for the command).

When a field is removed in the backend (e.g., `node_fingerprint` → `content_hash`, or prerequisites/difficulty/estimated_duration from EditableNode), remove it here too. Do not keep orphaned fields marked as optional "for compatibility".

### Component discipline

- New components for new concepts (`NodeSummaryEditPanel`, `ApproveButton`, `PreviousSnapshotDiff`, etc.). Do not name them `EditableFieldNew` or `EditableNodeModalV2`. Clean names.
- When a legacy component is replaced, delete it in the same commit as the new one goes live. No long coexistence.

## Pre-flight checklist for UI sub-stages

Before changing anything:

1. Which Phase / sub-stage .UI are you implementing?
2. What does vision §5 say about it? (Quote the UI-etap row.)
3. Is the backend sub-stage complete? If yes — generate the OpenAPI snapshot from backend code and diff against it (see "API contract is the integration point").
4. What files will you touch?
5. What is explicitly out of scope?
6. Acceptance: which manual scenario proves it works?

Wait for user confirmation before starting.

## Environment

- `.env.example` → `.env.local` with `VITE_API_BASE_URL` (e.g., `https://api-stage.pythoncourse.me`).
- Browser console errors in dev are signals, not warnings — treat them as failures.
