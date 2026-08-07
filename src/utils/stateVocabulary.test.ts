import { describe, it, expect } from 'vitest'
import type { ProcessingPhase, JobState } from '../types/api'
import {
  PHASE_VOCAB,
  JOB_STATE_LABEL,
  phaseVocab,
  phaseBadgeClass,
  phasePillClass,
} from './stateVocabulary'

// Second witness for totality (mirrors the backend ``_JOB_STATE_BY_STATUS``
// import-time guard + ``test_job_state``): the token lists are re-declared here
// independently, so a value added to a union without a vocabulary entry fails
// loudly rather than defaulting silently at a render site.
const ALL_PHASES: ProcessingPhase[] = [
  'queued',
  'processing',
  'awaiting_author',
  'ready',
  'error',
]

const ALL_JOB_STATES: JobState[] = [
  'queued',
  'processing',
  'ready',
  'error',
  'cancelled',
  'obsolete',
]

describe('PHASE_VOCAB — material phase axis', () => {
  it('covers exactly the five phase tokens, no more no less', () => {
    expect(Object.keys(PHASE_VOCAB).sort()).toEqual([...ALL_PHASES].sort())
  })

  it('gives every phase a non-empty distinct label', () => {
    const labels = ALL_PHASES.map((p) => PHASE_VOCAB[p].label)
    labels.forEach((l) => expect(l.length).toBeGreaterThan(0))
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('ratified words (§2)', () => {
    expect(PHASE_VOCAB.queued.label).toBe('У черзі')
    expect(PHASE_VOCAB.processing.label).toBe('Обробляється')
    expect(PHASE_VOCAB.awaiting_author.label).toBe('Очікує підтвердження')
    expect(PHASE_VOCAB.ready.label).toBe('Готово')
    expect(PHASE_VOCAB.error.label).toBe('Помилка')
  })

  it('splits queued/processing by pulse alone (both amber = "busy")', () => {
    expect(PHASE_VOCAB.queued.tone).toBe('busy')
    expect(PHASE_VOCAB.processing.tone).toBe('busy')
    expect(PHASE_VOCAB.queued.pulse).toBe(false)
    expect(PHASE_VOCAB.processing.pulse).toBe(true)
  })
})

describe('phaseVocab — total lookup', () => {
  it('returns the entry for a known phase', () => {
    expect(phaseVocab('ready')).toBe(PHASE_VOCAB.ready)
  })

  it('falls back to a muted "—" chip for an unknown phase (never crashes)', () => {
    const entry = phaseVocab('brand_new_phase' as ProcessingPhase)
    expect(entry.label).toBe('—')
    expect(entry.tone).toBe('muted')
  })
})

describe('phase colour resolvers', () => {
  it('emits the pulse only for the pulsing phase (processing)', () => {
    expect(phaseBadgeClass(PHASE_VOCAB.processing)).toContain('animate-pulse-soft')
    expect(phaseBadgeClass(PHASE_VOCAB.queued)).not.toContain('animate-pulse-soft')
    expect(phasePillClass(PHASE_VOCAB.processing)).toContain('animate-pulse-soft')
    expect(phasePillClass(PHASE_VOCAB.queued)).not.toContain('animate-pulse-soft')
  })

  it('maps awaiting to navy on both surfaces', () => {
    expect(phaseBadgeClass(PHASE_VOCAB.awaiting_author)).toContain('navy')
    expect(phasePillClass(PHASE_VOCAB.awaiting_author)).toContain('navy')
  })
})

describe('JOB_STATE_LABEL — work-state axis', () => {
  it('covers exactly the six job-state tokens, no more no less', () => {
    expect(Object.keys(JOB_STATE_LABEL).sort()).toEqual([...ALL_JOB_STATES].sort())
  })

  it('gives every job state a non-empty distinct label', () => {
    const labels = ALL_JOB_STATES.map((s) => JOB_STATE_LABEL[s])
    labels.forEach((l) => expect(l.length).toBeGreaterThan(0))
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('ratified words (§2), incl. the two that differ from the raw JobStatus map', () => {
    expect(JOB_STATE_LABEL.queued).toBe('У черзі')
    expect(JOB_STATE_LABEL.processing).toBe('Обробляється')
    expect(JOB_STATE_LABEL.ready).toBe('Готово')
    expect(JOB_STATE_LABEL.error).toBe('Помилка')
    expect(JOB_STATE_LABEL.cancelled).toBe('Скасовано')
    expect(JOB_STATE_LABEL.obsolete).toBe('Застаріло')
  })
})
