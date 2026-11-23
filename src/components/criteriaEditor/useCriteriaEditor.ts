import { useCallback, useMemo, useState } from 'react'
import { criteriaApi, criteriaRefusal, type CriteriaFieldValidationRefusal } from '../../api/criteria'
import { ApiError } from '../../api/client'
import { useLeaveGuard } from '../../hooks/useLeaveGuard'
import {
  CRITERIA_LIMITS,
  toOverrideRequest,
  type CriterionFormItem,
} from '../../utils/criteriaRules'
import type { CriteriaLayer, CriteriaView, Criterion } from '../../types/api'

export type RefusalBanner =
  | { kind: 'awaitingFirstSubmission' }
  | { kind: 'unknownCriterionId' }
  | { kind: 'checkMethodNotAdmitted' }
  | { kind: 'unknownConcept' }
  | { kind: 'mustByAuthorWithoutMust' }
  | { kind: 'invalidField' }
  | { kind: 'taskNotReady' }
  | { kind: 'noAccess' }
  | { kind: 'tooManyRequests' }
  | { kind: 'failedSave'; is5xx?: boolean; isNetwork?: boolean }

export interface UseCriteriaEditorOptions {
  documentId: string
  initialCriteria: Criterion[]
  layer: CriteriaLayer
  taskType: string | null
  onSaved: (view: CriteriaView) => void
  onAwaitingFirstSubmission?: () => void
  onRefreshConcepts?: () => void
  onRefreshCriteria?: () => void
}

function initFormItem(c: Criterion, layer: CriteriaLayer): CriterionFormItem {
  return {
    id: c.id,
    text: c.text,
    evidence: c.evidence,
    weight: c.weight,
    check_method: c.check_method,
    concepts: [...(c.concepts ?? [])],
    mandatory_points: (c.mandatory_points ?? []).map((p) => ({
      id: p.id,
      text: p.text,
    })),
    // P1: author layer keeps c.must_by_author; model layer starts as false
    must_by_author: layer === 'author' ? c.must_by_author === true : false,
    initialWeight: c.weight,
    isNew: false,
  }
}

function areItemsEqual(a: CriterionFormItem, b: CriterionFormItem): boolean {
  if (a.id !== b.id) return false
  if (a.isNew !== b.isNew) return false
  if (a.text !== b.text) return false
  if (a.evidence !== b.evidence) return false
  if (a.weight !== b.weight) return false
  if (a.check_method !== b.check_method) return false

  // must_by_author only matters for weight === 'must'
  if (a.weight === 'must' || b.weight === 'must') {
    if (Boolean(a.must_by_author) !== Boolean(b.must_by_author)) return false
  }

  // concepts check
  const aConcepts = a.concepts ?? []
  const bConcepts = b.concepts ?? []
  if (aConcepts.length !== bConcepts.length) return false
  for (let i = 0; i < aConcepts.length; i++) {
    if (aConcepts[i] !== bConcepts[i]) return false
  }

  // mandatory_points check
  const aPoints = a.mandatory_points ?? []
  const bPoints = b.mandatory_points ?? []
  if (aPoints.length !== bPoints.length) return false
  for (let i = 0; i < aPoints.length; i++) {
    if (aPoints[i]!.text !== bPoints[i]!.text) return false
  }

  return true
}

export function useCriteriaEditor({
  documentId,
  initialCriteria,
  layer,
  taskType,
  onSaved,
  onAwaitingFirstSubmission,
  onRefreshConcepts,
}: UseCriteriaEditorOptions) {
  const initialItems = useMemo(
    () => initialCriteria.map((c) => initFormItem(c, layer)),
    [initialCriteria, layer],
  )

  const savedCriteriaIds = useMemo(
    () => new Set(initialCriteria.map((c) => c.id)),
    [initialCriteria],
  )

  const [items, setItems] = useState<CriterionFormItem[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<RefusalBanner | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<
    CriteriaFieldValidationRefusal[]
  >([])

  // Dirty state: differs from initialItems
  const unsaved = useMemo(() => {
    if (items.length !== initialItems.length) return true
    for (let i = 0; i < items.length; i++) {
      if (!areItemsEqual(items[i]!, initialItems[i]!)) return true
    }
    return false
  }, [items, initialItems])

  const { blocker, allowNextMove } = useLeaveGuard(unsaved)

  // Client validation
  const isValid = useMemo(() => {
    if (
      items.length < CRITERIA_LIMITS.minCriteria ||
      items.length > CRITERIA_LIMITS.maxCriteria
    ) {
      return false
    }

    for (const item of items) {
      const trimmedText = item.text.trim()
      if (
        trimmedText.length === 0 ||
        trimmedText.length > CRITERIA_LIMITS.textChars
      ) {
        return false
      }

      const trimmedEvidence = item.evidence.trim()
      if (
        trimmedEvidence.length === 0 ||
        trimmedEvidence.length > CRITERIA_LIMITS.evidenceChars
      ) {
        return false
      }

      if (item.check_method === 'code_test' && taskType !== 'project') {
        return false
      }

      if (item.check_method === 'mandatory_points') {
        const pts = item.mandatory_points ?? []
        if (pts.length === 0 || pts.length > CRITERIA_LIMITS.maxPoints) {
          return false
        }
        for (const pt of pts) {
          const trimmedPt = pt.text.trim()
          if (
            trimmedPt.length === 0 ||
            trimmedPt.length > CRITERIA_LIMITS.pointChars
          ) {
            return false
          }
        }
      }

      if ((item.concepts ?? []).length > CRITERIA_LIMITS.maxConcepts) {
        return false
      }
    }

    return true
  }, [items, taskType])

  const updateCriterion = useCallback(
    (index: number, patch: Partial<CriterionFormItem>) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      )
    },
    [],
  )

  const addCriterion = useCallback(() => {
    setItems((prev) => {
      if (prev.length >= CRITERIA_LIMITS.maxCriteria) return prev
      const newItem: CriterionFormItem = {
        text: '',
        evidence: '',
        weight: 'should',
        check_method: 'model_verdict',
        concepts: [],
        mandatory_points: [],
        must_by_author: false,
        initialWeight: 'should',
        isNew: true,
      }
      return [...prev, newItem]
    })
  }, [])

  const removeCriterion = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length <= CRITERIA_LIMITS.minCriteria) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const moveCriterion = useCallback(
    (index: number, direction: 'up' | 'down') => {
      setItems((prev) => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1
        if (targetIndex < 0 || targetIndex >= prev.length) return prev
        const updated = [...prev]
        const [moved] = updated.splice(index, 1)
        if (!moved) return prev
        updated.splice(targetIndex, 0, moved)
        return updated
      })
    },
    [],
  )

  const save = useCallback(async () => {
    if (!isValid || saving) return

    setSaving(true)
    setServerError(null)
    setServerFieldErrors([])

    try {
      const payload = toOverrideRequest({
        criteria: items,
        savedCriteriaIds,
      })

      const updatedView = await criteriaApi.replace(documentId, payload)
      allowNextMove()
      onSaved(updatedView)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          const refusal = criteriaRefusal(err.body)
          if (refusal?.kind === 'coded') {
            if (refusal.code === 'AWAITING_FIRST_SUBMISSION') {
              setServerError({ kind: 'awaitingFirstSubmission' })
              onAwaitingFirstSubmission?.()
            } else if (refusal.code === 'UNKNOWN_CRITERION_ID') {
              setServerError({ kind: 'unknownCriterionId' })
            } else if (refusal.code === 'CHECK_METHOD_NOT_ADMITTED') {
              setServerError({ kind: 'checkMethodNotAdmitted' })
              setServerFieldErrors(
                items.flatMap((item, idx) =>
                  item.check_method === 'code_test'
                    ? [{ index: idx, field: 'check_method', loc: [] }]
                    : [],
                ),
              )
            } else if (refusal.code === 'UNKNOWN_CONCEPT') {
              setServerError({ kind: 'unknownConcept' })
              onRefreshConcepts?.()
            } else if (refusal.code === 'MUST_BY_AUTHOR_WITHOUT_MUST') {
              setServerError({ kind: 'mustByAuthorWithoutMust' })
              setServerFieldErrors(
                items.flatMap((item, idx) =>
                  item.weight !== 'must' && item.must_by_author
                    ? [{ index: idx, field: 'weight', loc: [] }]
                    : [],
                ),
              )
            } else if (refusal.code === 'TASK_NOT_READY') {
              setServerError({ kind: 'taskNotReady' })
            } else {
              setServerError({ kind: 'failedSave' })
            }
          } else if (refusal?.kind === 'validation') {
            setServerError({ kind: 'invalidField' })
            setServerFieldErrors(refusal.errors)
          } else {
            setServerError({ kind: 'failedSave' })
          }
        } else if (err.status === 403) {
          setServerError({ kind: 'noAccess' })
        } else if (err.status === 429) {
          setServerError({ kind: 'tooManyRequests' })
        } else if (err.status >= 500) {
          setServerError({ kind: 'failedSave', is5xx: true })
        } else {
          setServerError({ kind: 'failedSave' })
        }
      } else {
        // Network failure
        setServerError({ kind: 'failedSave', isNetwork: true })
      }
    } finally {
      setSaving(false)
    }
  }, [
    documentId,
    isValid,
    items,
    onAwaitingFirstSubmission,
    onRefreshConcepts,
    onSaved,
    allowNextMove,
    savedCriteriaIds,
    saving,
  ])

  const clearServerError = useCallback(() => {
    setServerError(null)
  }, [])

  return {
    items,
    unsaved,
    isValid,
    saving,
    serverError,
    serverFieldErrors,
    blocker,
    allowNextMove,
    updateCriterion,
    addCriterion,
    removeCriterion,
    moveCriterion,
    save,
    clearServerError,
  }
}
