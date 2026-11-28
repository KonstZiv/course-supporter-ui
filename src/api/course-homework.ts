import { api } from './client'
import type { CourseHomeworkSummary, CourseHomeworkTable } from '../types/api'

// М-10 — course homework overview (author app, scope PREP, X-API-Key).
// 404 ("Course not found.") surfaces via `ApiError.status`.

export const courseHomeworkApi = {
  summary: (courseId: string, includeTestStudents = false) => {
    const qs = new URLSearchParams({
      include_test_students: String(includeTestStudents),
    })
    return api.get<CourseHomeworkSummary>(
      `/api/v1/nodes/${encodeURIComponent(courseId)}/homework/summary?${qs.toString()}`,
    )
  },

  students: (
    courseId: string,
    params: {
      includeTestStudents?: boolean
      limit?: number
      offset?: number
    } = {},
  ) => {
    const qs = new URLSearchParams({
      include_test_students: String(params.includeTestStudents ?? false),
      limit: String(params.limit ?? 500),
      offset: String(params.offset ?? 0),
    })
    return api.get<CourseHomeworkTable>(
      `/api/v1/nodes/${encodeURIComponent(courseId)}/homework/students?${qs.toString()}`,
    )
  },
}
