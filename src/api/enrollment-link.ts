import { api } from './client'
import type { EnrollmentLink } from '../types/api'

// O-3 — the course's open enrolment link (author app, X-API-Key). Open lets a
// student enrol by the link without the author's approval; rotate issues a new
// link and the old one stops working; close stops new enrolments. Students who
// already enrolled stay on the course. All four answer with the same shape.
// 404 (unknown course) surfaces through `ApiError.status`.

const base = (courseId: string) =>
  `/api/v1/nodes/${encodeURIComponent(courseId)}/enrollment-link`

export const enrollmentLinkApi = {
  get: (courseId: string) => api.get<EnrollmentLink>(base(courseId)),
  open: (courseId: string) => api.post<EnrollmentLink>(`${base(courseId)}/open`),
  rotate: (courseId: string) =>
    api.post<EnrollmentLink>(`${base(courseId)}/rotate`),
  close: (courseId: string) => api.post<EnrollmentLink>(`${base(courseId)}/close`),
}
