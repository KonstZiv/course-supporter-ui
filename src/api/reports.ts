import { api } from './client'
import type { CostReport } from '../types/api'

export const reportsApi = {
  cost: () => api.get<CostReport>('/api/v1/reports/cost'),
}
