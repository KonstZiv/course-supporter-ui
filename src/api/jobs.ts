import { api } from './client'
import type { JobResponse, JobListResponse, StateClass } from '../types/api'

// Door-1 filters (step A §4). ``completed_after`` is an absolute ISO moment
// computed client-side (the server bounds only finished work by it; live work
// always passes). ``material_id`` / ``job_types`` exist on the route but the
// activity strip needs neither, so they are not exposed here.
export interface JobListParams {
  state_class?: StateClass
  completed_after?: string
  limit?: number
  offset?: number
}

export const jobsApi = {
  get: (jobId: string) =>
    api.get<JobResponse>(`/api/v1/jobs/${jobId}`),

  // Flat author work-list (GET /api/v1/jobs). Optional filters are dropped when
  // absent; limit/offset always sent with the door's own defaults so the query
  // shape is deterministic (mirrors ``studentsApi.list``).
  list: ({ state_class, completed_after, limit = 50, offset = 0 }: JobListParams = {}) => {
    const q = new URLSearchParams()
    if (state_class) q.set('state_class', state_class)
    if (completed_after) q.set('completed_after', completed_after)
    q.set('limit', String(limit))
    q.set('offset', String(offset))
    return api.get<JobListResponse>(`/api/v1/jobs?${q}`)
  },
}
