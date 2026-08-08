import { api } from './client'
import type {
  JobResponse,
  JobListResponse,
  MaterialHistoryResponse,
  StateClass,
} from '../types/api'

// Door-1 filters (step A §4). ``completed_after`` is an absolute ISO moment
// computed client-side (the server bounds only finished work by it; live work
// always passes). ``material_id`` narrows to one material's work — used by the
// history-row expansion (step Г c6); it is additive, so a call that omits it
// (the activity strip) is byte-for-byte unchanged. ``job_types`` stays unexposed
// (no consumer).
export interface JobListParams {
  state_class?: StateClass
  completed_after?: string
  material_id?: string
  limit?: number
  offset?: number
}

export const jobsApi = {
  get: (jobId: string) =>
    api.get<JobResponse>(`/api/v1/jobs/${jobId}`),

  // Flat author work-list (GET /api/v1/jobs). Optional filters are dropped when
  // absent; limit/offset always sent with the door's own defaults so the query
  // shape is deterministic (mirrors ``studentsApi.list``). ``material_id`` is
  // additive — omitted for the strip, present only for the history-row expansion.
  list: ({
    state_class,
    completed_after,
    material_id,
    limit = 50,
    offset = 0,
  }: JobListParams = {}) => {
    const q = new URLSearchParams()
    if (state_class) q.set('state_class', state_class)
    if (completed_after) q.set('completed_after', completed_after)
    if (material_id) q.set('material_id', material_id)
    q.set('limit', String(limit))
    q.set('offset', String(offset))
    return api.get<JobListResponse>(`/api/v1/jobs?${q}`)
  },

  // Door 2 — history grouped by material (GET /api/v1/jobs/history). Returns the
  // whole paginated wrapper (items + total + limit + offset): the page reader
  // (c5) needs ``total`` for its label and the bounds to place the page. No baked
  // size — limit/offset come from the call, because the two consumers ask for
  // different amounts (c5 a page; c6 derives from the promised count).
  history: (limit: number, offset: number) =>
    api.get<MaterialHistoryResponse>(
      `/api/v1/jobs/history?limit=${limit}&offset=${offset}`,
    ),
}
