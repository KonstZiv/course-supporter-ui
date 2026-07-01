import { api } from './client'
import type {
  CostSummaryResponse,
  HomeworkCostResponse,
  HomeworkCourseCostResponse,
  HomeworkTaskCostResponse,
} from '../types/api'

// vision §3 KD5 cost-reporting surface (post-0.7 backend contract).
//
// Two surfaces:
// * `summary` — the tenant-wide ingestion cost dashboard (0.UI). The
//   per-course drill-down endpoint (`GET /api/v1/cost/course/{id}`)
//   exists on the backend but its UI is still a Phase 1+ task — add
//   `course()` + `CourseCostResponse` here when that task is scoped.
// * `homework*` — the homework cost-attribution drill tree (6.HC-UI):
//   L1 `homework` → L2 `homeworkCourse(id)` → L3 `homeworkTask(id)`,
//   each a request keyed by the parent. Same author `X-API-Key` auth
//   (scope PREP/CHECK), same `buildQuery`; no Redis cache backend-side.
//
// `from` / `to` are optional client-side: omitted → backend resolves
// to `Tenant.created_at..today UTC` (all-time fallback; verified for the
// homework handlers too at 6.HC-UI pre-flight). When sent, format is
// YYYY-MM-DD (FastAPI native `date` parsing). Backend rejects
// `from > to` with HTTP 422; UI also guards on the client for faster
// feedback.

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

  // Homework cost drill tree (6.HC). Path ids are UUIDs; encoded
  // defensively. A foreign/unknown id returns an empty breakdown (not a
  // 404) — the UI renders that as the normal "no data" placeholder.
  homework: (params: CostQueryParams = {}) =>
    api.get<HomeworkCostResponse>(`/api/v1/cost/homework${buildQuery(params)}`),

  homeworkCourse: (courseNodeId: string, params: CostQueryParams = {}) =>
    api.get<HomeworkCourseCostResponse>(
      `/api/v1/cost/homework/course/${encodeURIComponent(courseNodeId)}${buildQuery(params)}`,
    ),

  homeworkTask: (authoredDocumentId: string, params: CostQueryParams = {}) =>
    api.get<HomeworkTaskCostResponse>(
      `/api/v1/cost/homework/task/${encodeURIComponent(authoredDocumentId)}${buildQuery(params)}`,
    ),
}
