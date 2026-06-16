import { api } from './client'
import type {
  JobResponse,
  NodeSummaryEditView,
  NodeSummaryFinal,
  NotYetGeneratedDetail,
  UncoveredStaleNodesDetail,
} from '../types/api'

// NodeSummary methodist-layer endpoints (Phase 3.2.x backend). The
// generation trigger landed in 3.2.5a; the review/edit surface (edit-view /
// approve / accept-raw) lands in 3.2.5b. PATCH lands in c4.
export const summaryApi = {
  // POST /api/v1/nodes/{node_id}/summary/generate → 202 + full JobResponse.
  // ``force`` widens only the API's 422 decision on uncovered_stale nodes;
  // memo-skip is unconditional inside the orchestrator.
  generate: (nodeId: string, force = false) =>
    api.post<JobResponse>(`/api/v1/nodes/${nodeId}/summary/generate`, { force }),

  // GET /api/v1/node-summaries/{node_id}/edit-view → final + raw_observations
  // + previous_snapshot in one call. 404 when no summary exists yet.
  editView: (nodeId: string) =>
    api.get<NodeSummaryEditView>(
      `/api/v1/node-summaries/${nodeId}/edit-view`,
    ),

  // POST .../final/approve — sets approved_at=now() + hard-deletes the
  // snapshot. 200 → the updated Final (consumed directly, no refetch).
  approve: (nodeId: string) =>
    api.post<NodeSummaryFinal>(
      `/api/v1/node-summaries/${nodeId}/final/approve`,
    ),

  // POST .../final/accept-raw — overwrites Final from Raw + approves. 200 →
  // the updated Final.
  acceptRaw: (nodeId: string) =>
    api.post<NodeSummaryFinal>(
      `/api/v1/node-summaries/${nodeId}/final/accept-raw`,
    ),
}

/**
 * Narrow a raw HTTPException ``detail`` object to the uncovered-stale-nodes
 * shape.
 *
 * Matches by the EXACT ``reason`` value (Invariant 4) — never by field
 * presence: sibling summary routes return ``{reason: "not_yet_generated"}``
 * (P6 GET, consumed in 3.2.5b) and that case must NOT trigger the branch.
 *
 * NOTE: operates on the inner ``detail`` object, NOT on ``ApiError.body``
 * directly — use :func:`uncoveredStaleDetail` to unwrap the FastAPI envelope
 * from a caught error.
 */
export function isUncoveredStaleNodes(
  detail: unknown,
): detail is UncoveredStaleNodesDetail {
  return (
    typeof detail === 'object' &&
    detail !== null &&
    (detail as { reason?: unknown }).reason === 'uncovered_stale_nodes'
  )
}

/**
 * Extract the uncovered-stale 422 detail from an ``ApiError.body``.
 *
 * FastAPI wraps a raised ``HTTPException(detail=...)`` under a top-level
 * ``detail`` key on the wire (``{"detail": {"reason": ...}}``), and
 * ``client.ts`` stores that full body verbatim on ``ApiError.body``. This
 * mirrors the ``utils/apiError.ts`` convention (``rejectionDetail`` reads
 * ``body.detail`` for SECURITY_REJECTED) — the envelope MUST be unwrapped
 * before narrowing, otherwise the reason sits one level too deep and the
 * branch silently never fires (the live-§2 c4 bug).
 *
 * Returns the inner detail when it is the uncovered-stale shape, else null.
 */
export function uncoveredStaleDetail(
  body: unknown,
): UncoveredStaleNodesDetail | null {
  const detail = (body as { detail?: unknown } | null)?.detail
  return isUncoveredStaleNodes(detail) ? detail : null
}

/**
 * Extract the ``not_yet_generated`` 404 detail from an ``ApiError.body``.
 *
 * Mirrors :func:`uncoveredStaleDetail` — unwraps the FastAPI ``{detail: ...}``
 * envelope and matches the EXACT reason, never reading ``body.reason``
 * directly (KD-D 3.2.5a / Інваріант #7). The sibling generic 404
 * (``{detail: "Node not found"}``, a string) returns null here, so callers
 * can distinguish "no summary yet" from "node gone" without a brittle
 * field-presence check.
 */
export function notYetGeneratedDetail(
  body: unknown,
): NotYetGeneratedDetail | null {
  const detail = (body as { detail?: unknown } | null)?.detail
  return typeof detail === 'object' &&
    detail !== null &&
    (detail as { reason?: unknown }).reason === 'not_yet_generated'
    ? (detail as NotYetGeneratedDetail)
    : null
}
