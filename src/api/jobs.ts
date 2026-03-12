import { api } from './client'
import type { JobResponse } from '../types/api'

export const jobsApi = {
  get: (jobId: string) =>
    api.get<JobResponse>(`/api/v1/jobs/${jobId}`),
}
