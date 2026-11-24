import { describe, expect, it } from 'vitest'
import type { CriteriaInForce, Criterion } from '../types/api'
import {
  CRITERIA_LIMITS,
  PASS_THRESHOLD_AUTHOR_MUSTS,
  PASS_THRESHOLD_NO_AUTHOR_MUSTS,
  passRule,
  toOverrideRequest,
} from './criteriaRules'

describe('CRITERIA_LIMITS and PASS thresholds', () => {
  it('mirrors the specification constants exactly (60/600/10/300/10 and 70/80)', () => {
    expect(CRITERIA_LIMITS.maxCriteria).toBe(60)
    expect(CRITERIA_LIMITS.minCriteria).toBe(1)
    expect(CRITERIA_LIMITS.textChars).toBe(600)
    expect(CRITERIA_LIMITS.evidenceChars).toBe(600)
    expect(CRITERIA_LIMITS.maxConcepts).toBe(10)
    expect(CRITERIA_LIMITS.pointChars).toBe(300)
    expect(CRITERIA_LIMITS.maxPoints).toBe(10)

    expect(PASS_THRESHOLD_AUTHOR_MUSTS).toBe(70)
    expect(PASS_THRESHOLD_NO_AUTHOR_MUSTS).toBe(80)
  })
})

describe('passRule', () => {
  const cMust: Criterion = {
    id: 'c1',
    text: 'Must criterion',
    evidence: 'Evidence',
    weight: 'must',
    check_method: 'model_verdict',
    soft_descent: false,
    concepts: [],
    mandatory_points: [],
  }

  const cShould: Criterion = {
    id: 'c2',
    text: 'Should criterion',
    evidence: 'Evidence',
    weight: 'should',
    check_method: 'model_verdict',
    soft_descent: false,
    concepts: [],
    mandatory_points: [],
  }

  it('evaluates model layer: always score rule with threshold 80, even if must criteria exist', () => {
    const inForceWithMust: CriteriaInForce = {
      layer: 'model',
      criteria: [cMust, cShould],
    }
    expect(passRule(inForceWithMust)).toEqual({
      kind: 'score',
      threshold: 80,
      hasModelMusts: true,
    })

    const inForceNoMust: CriteriaInForce = {
      layer: 'model',
      criteria: [cShould],
    }
    expect(passRule(inForceNoMust)).toEqual({
      kind: 'score',
      threshold: 80,
      hasModelMusts: false,
    })
  })

  it('evaluates author layer without must_by_author: true: score rule with threshold 80', () => {
    const inForceAuthorNoMarks: CriteriaInForce = {
      layer: 'author',
      criteria: [
        { ...cMust, must_by_author: false },
        cShould,
      ],
    }
    expect(passRule(inForceAuthorNoMarks)).toEqual({
      kind: 'score',
      threshold: 80,
      hasModelMusts: true,
    })
  })

  it('evaluates author layer with must_by_author: true: strict rule with threshold 70 and count', () => {
    const inForceAuthorWithMarks: CriteriaInForce = {
      layer: 'author',
      criteria: [
        { ...cMust, must_by_author: true },
        { ...cMust, id: 'c3', must_by_author: false },
        cShould,
      ],
    }
    expect(passRule(inForceAuthorWithMarks)).toEqual({
      kind: 'strict',
      count: 1,
      threshold: 70,
    })

    const inForceMultipleMarks: CriteriaInForce = {
      layer: 'author',
      criteria: [
        { ...cMust, id: 'c1', must_by_author: true },
        { ...cMust, id: 'c3', must_by_author: true },
        cShould,
      ],
    }
    expect(passRule(inForceMultipleMarks)).toEqual({
      kind: 'strict',
      count: 2,
      threshold: 70,
    })
  })

  it('handles empty or null inForce safely', () => {
    expect(passRule(null)).toEqual({
      kind: 'score',
      threshold: 80,
      hasModelMusts: false,
    })
    expect(passRule(undefined)).toEqual({
      kind: 'score',
      threshold: 80,
      hasModelMusts: false,
    })
  })
})

describe('toOverrideRequest', () => {
  it('strips soft_descent completely', () => {
    const formWithSoftDescent = [
      {
        id: 'c1',
        text: 'Test',
        evidence: 'Ev',
        weight: 'must' as const,
        check_method: 'code_test' as const,
        soft_descent: true,
        concepts: ['c1'],
        mandatory_points: [],
      },
    ]
    const req = toOverrideRequest(formWithSoftDescent as unknown as Criterion[])
    const first = req.criteria[0]!
    expect(first).not.toHaveProperty('soft_descent')
    expect(first).toEqual({
      id: 'c1',
      text: 'Test',
      evidence: 'Ev',
      weight: 'must',
      check_method: 'code_test',
      concepts: ['c1'],
      mandatory_points: [],
      must_by_author: false,
    })
  })

  it('includes id only for saved criteria and omits id for new criteria', () => {
    const form = {
      savedCriteriaIds: new Set(['c1', 'c2']),
      criteria: [
        {
          id: 'c1',
          text: 'Saved 1',
          evidence: 'Ev 1',
          weight: 'should' as const,
          check_method: 'model_verdict' as const,
        },
        {
          id: 'c99',
          isNew: true,
          text: 'New criterion',
          evidence: 'Ev new',
          weight: 'should' as const,
          check_method: 'model_verdict' as const,
        },
        {
          text: 'New criterion without id',
          evidence: 'Ev new 2',
          weight: 'may' as const,
          check_method: 'model_verdict' as const,
        },
      ],
    }
    const req = toOverrideRequest(form)
    const c0 = req.criteria[0]!
    const c1 = req.criteria[1]!
    const c2 = req.criteria[2]!
    expect(c0.id).toBe('c1')
    expect(c1.id).toBeUndefined()
    expect(c2.id).toBeUndefined()
    expect('id' in c1).toBe(false)
    expect('id' in c2).toBe(false)
  })

  it('sends must_by_author explicitly only for must weight and drops it when weight is lowered', () => {
    const form = [
      {
        id: 'c1',
        text: 'Must author',
        evidence: 'Ev',
        weight: 'must' as const,
        check_method: 'model_verdict' as const,
        must_by_author: true,
      },
      {
        id: 'c2',
        text: 'Lowered to should',
        evidence: 'Ev',
        weight: 'should' as const,
        check_method: 'model_verdict' as const,
        must_by_author: true, // was previously true, but weight lowered
      },
      {
        id: 'c3',
        text: 'May weight',
        evidence: 'Ev',
        weight: 'may' as const,
        check_method: 'model_verdict' as const,
        must_by_author: false,
      },
    ]
    const req = toOverrideRequest(form)
    const c0 = req.criteria[0]!
    const c1 = req.criteria[1]!
    const c2 = req.criteria[2]!
    expect(c0.must_by_author).toBe(true)
    expect(c1.must_by_author).toBeUndefined()
    expect('must_by_author' in c1).toBe(false)
    expect(c2.must_by_author).toBeUndefined()
    expect('must_by_author' in c2).toBe(false)
  })

  it('P1 decision: a new must or raised must criterion defaults to must_by_author: false', () => {
    const form = [
      {
        isNew: true,
        text: 'New must criterion',
        evidence: 'Ev',
        weight: 'must' as const,
        check_method: 'model_verdict' as const,
        // must_by_author not specified
      },
      {
        id: 'c1',
        text: 'Raised to must',
        evidence: 'Ev',
        weight: 'must' as const,
        check_method: 'model_verdict' as const,
        must_by_author: undefined,
      },
    ]
    const req = toOverrideRequest(form)
    const c0 = req.criteria[0]!
    const c1 = req.criteria[1]!
    expect(c0.must_by_author).toBe(false)
    expect(c1.must_by_author).toBe(false)
  })
})
