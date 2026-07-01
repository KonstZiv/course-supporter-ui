import { api } from './client'
import type {
  EnrollmentRequest,
  ProvisionStudentRequest,
  ProvisionStudentResponse,
  StudentEnrollmentsResponse,
  StudentRosterResponse,
} from '../types/api'

// Phase 6 T5 — tenant-admin student management (author app, scope PREP,
// X-API-Key via the shared `api` client). Two read routes (T5-BE) + four
// write routes (T1). Bind-picker course roots come from `nodesApi.listRoots`
// (`GET /nodes`), reused as-is — not duplicated here.
//
// Runtime error codes (404 / 409 — not in OpenAPI, only 422 is auto-declared)
// are surfaced through `ApiError.status` + `ApiError.body.detail` and mapped to
// author-facing phrases in `components/students/studentErrors.ts`.

export const studentsApi = {
  // Read (T5-BE) ----------------------------------------------------------
  list: (limit = 20, offset = 0) =>
    api.get<StudentRosterResponse>(
      `/api/v1/students?limit=${limit}&offset=${offset}`,
    ),

  enrollments: (studentId: string) =>
    api.get<StudentEnrollmentsResponse>(
      `/api/v1/students/${encodeURIComponent(studentId)}/enrollments`,
    ),

  // Write (T1) ------------------------------------------------------------
  provision: (body: ProvisionStudentRequest) =>
    api.post<ProvisionStudentResponse>('/api/v1/students', body),

  revoke: (studentId: string) =>
    api.post<void>(`/api/v1/students/${encodeURIComponent(studentId)}/revoke`),

  restore: (studentId: string) =>
    api.post<void>(`/api/v1/students/${encodeURIComponent(studentId)}/restore`),

  bind: (body: EnrollmentRequest) =>
    api.post<{ student_id: string; course_node_id: string }>(
      '/api/v1/students/enrollments',
      body,
    ),

  // DELETE carries no body — student/course go in the query string.
  unbind: (studentId: string, courseNodeId: string) =>
    api.delete<void>(
      `/api/v1/students/enrollments?student_id=${encodeURIComponent(
        studentId,
      )}&course_node_id=${encodeURIComponent(courseNodeId)}`,
    ),
}
