import type {
  CriteriaInForce,
  CriteriaOverrideRequest,
  CriteriaWeight,
  Criterion,
  CriterionEdit,
} from '../types/api'

/**
 * Editorial limits for criteria forms and payload validation (spec 1.3-1.4, 3.K7, 5.A1).
 * 60 criteria max, 600 chars for text and evidence, 10 concepts max,
 * 300 chars for mandatory point text, 10 mandatory points max.
 */
export const CRITERIA_LIMITS = {
  maxCriteria: 60,
  minCriteria: 1,
  textChars: 600,
  evidenceChars: 600,
  maxConcepts: 10,
  pointChars: 300,
  maxPoints: 10,
} as const

/**
 * Pass rule score thresholds (spec 1.7, 6.Р4).
 * 70 when at least one author-mandatory must is present.
 * 80 otherwise (model list or author list without author-marked musts).
 */
export const PASS_THRESHOLD_AUTHOR_MUSTS = 70
export const PASS_THRESHOLD_NO_AUTHOR_MUSTS = 80

export type PassRuleResult =
  | {
      kind: 'strict'
      count: number
      threshold: number
    }
  | {
      kind: 'score'
      threshold: number
      hasModelMusts: boolean
    }

/**
 * Evaluates the pass rule for a given in_force criteria state.
 *
 * - author layer with at least one `must_by_author: true` criterion:
 *   'strict' pass rule: every author-mandatory must must be met AND score >= 70.
 * - otherwise (model layer, or author layer with no `must_by_author: true`):
 *   'score' pass rule: score >= 80.
 *   `hasModelMusts` is true if the list contains any criterion with weight 'must'
 *   without author-mandatory flag (in model layer, or author layer where must_by_author is not true).
 */
export function passRule(inForce: CriteriaInForce | null | undefined): PassRuleResult {
  if (!inForce || !Array.isArray(inForce.criteria)) {
    return {
      kind: 'score',
      threshold: PASS_THRESHOLD_NO_AUTHOR_MUSTS,
      hasModelMusts: false,
    }
  }

  const isAuthor = inForce.layer === 'author'
  const authorMustCount = isAuthor
    ? inForce.criteria.filter(
        (c) => c.weight === 'must' && c.must_by_author === true,
      ).length
    : 0

  if (authorMustCount > 0) {
    return {
      kind: 'strict',
      count: authorMustCount,
      threshold: PASS_THRESHOLD_AUTHOR_MUSTS,
    }
  }

  const hasModelMusts = inForce.criteria.some((c) => c.weight === 'must')
  return {
    kind: 'score',
    threshold: PASS_THRESHOLD_NO_AUTHOR_MUSTS,
    hasModelMusts,
  }
}

/**
 * Input criterion item for form conversion.
 * May be a stored Criterion, a CriterionEdit, or a form draft object.
 */
export interface CriterionFormItem {
  id?: string | null
  text: string
  evidence: string
  weight: CriteriaWeight
  check_method: CriterionEdit['check_method']
  concepts?: string[]
  mandatory_points?: Array<{ id?: string | null; text: string }>
  must_by_author?: boolean | null
  isNew?: boolean
  initialWeight?: CriteriaWeight
}

export interface CriteriaFormState {
  criteria: CriterionFormItem[]
  savedCriteriaIds?: Set<string>
}

/**
 * Converts form criteria into CriteriaOverrideRequest payload:
 * - soft_descent is stripped (never sent).
 * - id is included only for saved criteria (omitted for new criteria).
 * - mandatory point id is included only when already saved, omitted for new points.
 * - must_by_author is sent explicitly only for weight 'must' (true / false),
 *   and omitted (not sent / undefined) when weight is not 'must'.
 * - when weight is lowered from 'must' to 'should'/'may', must_by_author is dropped.
 * - for a new criterion or one raised to 'must', default to false unless explicitly set (P1).
 */
export function toOverrideRequest(
  form: CriteriaFormState | CriterionFormItem[] | Criterion[],
): CriteriaOverrideRequest {
  const items: CriterionFormItem[] = Array.isArray(form)
    ? form
    : form.criteria ?? []

  const savedIds: Set<string> | null =
    !Array.isArray(form) && form.savedCriteriaIds
      ? form.savedCriteriaIds
      : null

  const criteria: CriterionEdit[] = items.map((item) => {
    // Determine id: if savedIds provided, only keep id if in savedIds;
    // if item.isNew is true, id is omitted;
    // otherwise keep id if present and not empty.
    let id: string | null | undefined = undefined
    if (!item.isNew && item.id) {
      if (!savedIds || savedIds.has(item.id)) {
        id = item.id
      }
    }

    const weight = item.weight

    // must_by_author rule:
    // Only sent for weight === 'must'.
    // If weight !== 'must', must_by_author is undefined (dropped).
    // For weight === 'must':
    // If item.must_by_author === true, send true.
    // Otherwise false (P1: new or raised or default is false).
    let must_by_author: boolean | undefined = undefined
    if (weight === 'must') {
      must_by_author = item.must_by_author === true
    }

    // Process mandatory_points:
    // Only included if check_method is mandatory_points
    const mandatory_points =
      item.check_method === 'mandatory_points' && item.mandatory_points
        ? item.mandatory_points.map((pt) => ({
            ...(pt.id ? { id: pt.id } : {}),
            text: pt.text.trim(),
          }))
        : []

    const edit: CriterionEdit = {
      ...(id ? { id } : {}),
      text: item.text.trim(),
      evidence: item.evidence.trim(),
      weight,
      check_method: item.check_method,
      concepts: item.concepts ?? [],
      mandatory_points,
      ...(must_by_author !== undefined ? { must_by_author } : {}),
    }

    return edit
  })

  return { criteria }
}
