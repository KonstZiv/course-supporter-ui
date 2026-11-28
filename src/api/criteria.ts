import { api } from './client'
import type {
  CriteriaOverrideRequest,
  CriteriaView,
} from '../types/api'

export interface CriteriaCodedRefusal {
  code: string
  details: string
}

export interface CriteriaFieldValidationRefusal {
  index: number
  field: string
  loc: (string | number)[]
  msg?: string
  type?: string
}

export type CriteriaRefusal =
  | { kind: 'coded'; code: string; details: string }
  | {
      kind: 'validation'
      errors: CriteriaFieldValidationRefusal[]
    }

export const criteriaApi = {
  read: (documentId: string) =>
    api.get<CriteriaView>(`/api/v1/documents/${documentId}/criteria`),

  compose: (documentId: string) =>
    api.post<CriteriaView>(`/api/v1/documents/${documentId}/criteria/compose`),

  replace: (documentId: string, body: CriteriaOverrideRequest) =>
    api.put<CriteriaView>(`/api/v1/documents/${documentId}/criteria/override`, body),

  reset: (documentId: string) =>
    api.delete<CriteriaView>(`/api/v1/documents/${documentId}/criteria/override`),
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Reader for 422 refusal responses from criteria endpoints:
 * 1. Coded refusal from criteria service: `{ detail: { code: string, details: string } }`
 * 2. Pydantic validation error array: `{ detail: [{ loc: ["body", "criteria", index, field, ...], msg, type }, ...] }`
 *
 * Returns null for any other body (e.g. 404 string `{ detail: "Document not found" }`, non-object, etc.).
 */
export function criteriaRefusal(body: unknown): CriteriaRefusal | null {
  const top = objectOrNull(body)
  if (!top) return null

  // 1. Coded refusal
  const detailObj = objectOrNull(top.detail)
  if (detailObj) {
    const { code, details } = detailObj
    if (typeof code === 'string' && typeof details === 'string') {
      return { kind: 'coded', code, details }
    }
  }

  // 2. Pydantic array
  if (Array.isArray(top.detail)) {
    const errors: CriteriaFieldValidationRefusal[] = []
    for (const item of top.detail) {
      const err = objectOrNull(item)
      if (!err || !Array.isArray(err.loc)) continue
      const loc = err.loc as (string | number)[]
      // Expected loc: ["body", "criteria", <index>, "<field>", ...]
      // We look for index at loc[2] and field at loc[3] when loc[0] === 'body' && loc[1] === 'criteria',
      // or extract numeric index and following string field from loc.
      let index = -1
      let field = ''
      if (loc[0] === 'body' && loc[1] === 'criteria' && typeof loc[2] === 'number') {
        index = loc[2]
        field = typeof loc[3] === 'string' ? loc[3] : ''
      } else {
        const numIdx = loc.findIndex((part) => typeof part === 'number')
        if (numIdx !== -1) {
          index = loc[numIdx] as number
          field = typeof loc[numIdx + 1] === 'string' ? (loc[numIdx + 1] as string) : ''
        }
      }
      errors.push({
        index,
        field,
        loc,
        msg: typeof err.msg === 'string' ? err.msg : undefined,
        type: typeof err.type === 'string' ? err.type : undefined,
      })
    }
    if (errors.length > 0) {
      return { kind: 'validation', errors }
    }
  }

  return null
}
