import { api } from './client'

export interface MethodistPlanResponse {
  bottom_up_jobs: { id: string; status: string }[]
  top_down_jobs: { id: string; status: string }[]
  estimated_llm_calls: number
}

export interface MethodistNodeResult {
  editable_id: string
  node_type: string
  title: string
  methodological_content: Record<string, unknown> | null
  methodological_markdown: string | null
  has_methodist_output: boolean
}

export const methodistApi = {
  trigger: (nodeId: string) =>
    api.post<MethodistPlanResponse>(`/api/v1/nodes/${nodeId}/methodist`),

  getResults: (nodeId: string) =>
    api.get<MethodistNodeResult[]>(`/api/v1/nodes/${nodeId}/methodist`),
}
