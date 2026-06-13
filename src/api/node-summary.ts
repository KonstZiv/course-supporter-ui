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
 * Narrow an ``ApiError.body`` to the uncovered-stale-nodes 422 detail.
 *
 * Matches by the EXACT ``reason`` value (Інваріант 4) — never by field
 * presence: sibling summary routes return ``{reason: "not_yet_generated"}``
 * (P6 GET, consumed in 3.2.5b) under the same opaque ``body: unknown``, and
 * that case must NOT trigger the uncovered-stale branch.
 */
export function isUncoveredStaleNodes(
  body: unknown,
): body is UncoveredStaleNodesDetail {
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { reason?: unknown }).reason === 'uncovered_stale_nodes'
  )
}
