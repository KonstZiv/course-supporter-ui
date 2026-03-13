import { api } from './client'
import type {
  JobResponse,
  ReconciliationPreviewResponse,
  ReconciliationIssue,
  EditableTreeResponse,
} from '../types/api'

export const reconciliationApi = {
  preview: (nodeId: string) =>
    api.post<JobResponse>(`/api/v1/nodes/${nodeId}/reconcile/preview`),

  getResult: (nodeId: string, jobId: string) =>
    api.get<ReconciliationPreviewResponse>(
      `/api/v1/nodes/${nodeId}/reconcile/preview/result?job_id=${jobId}`,
    ),

  apply: (nodeId: string, acceptedIssueIds: string[], issues: ReconciliationIssue[]) =>
    api.post<EditableTreeResponse>(`/api/v1/nodes/${nodeId}/reconcile/apply`, {
      accepted_issue_ids: acceptedIssueIds,
      issues,
    }),
}
