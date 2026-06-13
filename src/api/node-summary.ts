import { api } from './client'
import type { JobResponse, UncoveredStaleNodesDetail } from '../types/api'

// NodeSummary methodist-layer endpoints (Phase 3.2.x backend). This slice
// (3.2.5a) consumes only the generation trigger; edit-view / approve /
// accept-raw / PATCH land here in 3.2.5b.
export const summaryApi = {
  // POST /api/v1/nodes/{node_id}/summary/generate → 202 + full JobResponse.
  // ``force`` widens only the API's 422 decision on uncovered_stale nodes;
  // memo-skip is unconditional inside the orchestrator.
  generate: (nodeId: string, force = false) =>
    api.post<JobResponse>(`/api/v1/nodes/${nodeId}/summary/generate`, { force }),
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
