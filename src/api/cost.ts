import { api } from './client'
import type { CostSummaryResponse } from '../types/api'

// vision §3 KD5 cost-reporting surface (post-0.7 backend contract).
//
// 0.UI scope exposes only the tenant-wide summary. The per-course
// drill-down endpoint (`GET /api/v1/cost/course/{course_node_id}`)
// exists on the backend but its UI lands in a Phase 1+ task — add
// `course()` + `CourseCostResponse` here when that task is scoped.
//
// `from` / `to` are optional client-side: omitted → backend resolves
// to `Tenant.created_at..today UTC` (all-time fallback). When sent,
// format is YYYY-MM-DD (FastAPI native `date` parsing). Backend
// rejects `from > to` with HTTP 422; UI also guards on the client for
// faster feedback.

export interface CostQueryParams {
  from?: string
  to?: string
}

function buildQuery(params: CostQueryParams): string {
  const parts: string[] = []
  if (params.from) parts.push(`from=${encodeURIComponent(params.from)}`)
  if (params.to) parts.push(`to=${encodeURIComponent(params.to)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export const costApi = {
  summary: (params: CostQueryParams = {}) =>
    api.get<CostSummaryResponse>(`/api/v1/cost/summary${buildQuery(params)}`),
}
