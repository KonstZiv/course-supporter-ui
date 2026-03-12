import { api } from './client'
import type {
  GenerationPlanResponse,
  SnapshotDetailResponse,
  GenerationMode,
} from '../types/api'

export const generationApi = {
  generate: (nodeId: string, mode: GenerationMode = 'free') =>
    api.post<GenerationPlanResponse>(`/api/v1/nodes/${nodeId}/generate`, { mode }),

  getLatest: (nodeId: string) =>
    api.get<SnapshotDetailResponse>(`/api/v1/nodes/${nodeId}/structure`),
}
