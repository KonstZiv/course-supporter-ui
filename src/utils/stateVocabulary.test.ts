import { describe, it, expect } from 'vitest'
import type { ProcessingPhase, JobState, AuthorJobType, TestState } from '../types/api'
import { editorTexts } from '../components/testEditor/editorTexts'
import {
  phaseVocab,
  pillVocab,
  phaseBadgeClass,
  phasePillClass,
  jobStateWordClass,
  jobStateLabel,
  jobKindLabel,
  testStateVocab,
  testStateChips,
  pillHint,
} from './stateVocabulary'

// Second witness for totality (mirrors the backend ``_JOB_STATE_BY_STATUS``
// import-time guard + ``test_job_state``): the token lists are re-declared here
// independently, so a value added to a union without a vocabulary entry fails
// loudly rather than defaulting silently at a render site. Keep them hand-written
// — never derive a list from its union type (e.g. via a mapped type): a derived
// list would agree with the map by construction, turning the lock into a
// self-witness that no longer catches a composition drift.
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

const ALL_AUTHOR_JOB_TYPES: AuthorJobType[] = [
  'document_processing',
  'document_preparation',
  'node_summary_regeneration',
  'base_normalize',
]

describe('phaseVocab — material phase axis', () => {
  it('covers exactly the five phase tokens, no more no less', () => {
    const entries = ALL_PHASES.map((p) => phaseVocab('uk', p))
    expect(entries.length).toBe(ALL_PHASES.length)
  })

  it('gives every phase a non-empty distinct label', () => {
    const labels = ALL_PHASES.map((p) => phaseVocab('uk', p).label)
    labels.forEach((l) => expect(l.length).toBeGreaterThan(0))
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('ratified words (§2)', () => {
    expect(phaseVocab('uk', 'queued').label).toBe('У черзі')
    expect(phaseVocab('uk', 'processing').label).toBe('Обробляється')
    expect(phaseVocab('uk', 'awaiting_author').label).toBe('Очікує підтвердження')
    expect(phaseVocab('uk', 'ready').label).toBe('Готово')
    expect(phaseVocab('uk', 'error').label).toBe('Помилка')
  })

  it('splits queued/processing by pulse alone (both amber = "busy")', () => {
    expect(phaseVocab('uk', 'queued').tone).toBe('busy')
    expect(phaseVocab('uk', 'processing').tone).toBe('busy')
    expect(phaseVocab('uk', 'queued').pulse).toBe(false)
    expect(phaseVocab('uk', 'processing').pulse).toBe(true)
  })
})

describe('phaseVocab — total lookup', () => {
  it('returns the entry for a known phase', () => {
    expect(phaseVocab('uk', 'ready')).toEqual({
      label: 'Готово',
      tone: 'ready',
      pulse: false,
    })
  })

  it('falls back to a muted "—" chip for an unknown phase (never crashes)', () => {
    const entry = phaseVocab('uk', 'brand_new_phase' as ProcessingPhase)
    expect(entry.label).toBe('—')
    expect(entry.tone).toBe('muted')
  })
})

describe('pillVocab — a canvas pill', () => {
  it('keeps a test neutral and names it when the tree does not say whether it is published (an older backend)', () => {
    expect(pillVocab('uk', { source_type: 'test_object', processing_phase: 'ready' })).toEqual({
      label: 'тест',
      tone: 'muted',
      pulse: false,
    })
  })

  it.each([
    ['draft', 'Не опубліковано', 'muted'],
    ['published', 'Опубліковано', 'ready'],
    ['changed', 'Є неопубліковані зміни', 'awaiting'],
  ] as const)('gives a %s test the editor\'s word %s', (state, label, tone) => {
    expect(
      pillVocab('uk', { source_type: 'test_object', processing_phase: 'ready', test_state: state }),
    ).toEqual({ label, tone, pulse: false })
  })

  it('keeps a test with a null or unknown state neutral', () => {
    for (const test_state of [null, 'brand_new' as TestState]) {
      expect(
        pillVocab('uk', { source_type: 'test_object', processing_phase: 'ready', test_state }).label,
      ).toBe('тест')
    }
  })

  it('takes the words from the test editor, not a copy of them', () => {
    const texts = editorTexts('uk')
    expect(testStateVocab('uk', 'draft')?.label).toBe(texts.notPublished)
    expect(testStateVocab('uk', 'published')?.label).toBe(texts.published)
    expect(testStateVocab('uk', 'changed')?.label).toBe(texts.unpublishedChanges)
  })

  it('gives any other material its phase', () => {
    expect(pillVocab('uk', { source_type: 'text', processing_phase: 'ready' })).toEqual(
      phaseVocab('uk', 'ready'),
    )
  })
})

describe('a test in the tree — hint and panel chips (task Б2)', () => {
  it('lower-cases a test state after the dash, leaving the editor\'s word as it is', () => {
    const texts = editorTexts('uk')
    expect(pillHint('uk', 'Змінні', { label: texts.notPublished, tone: 'muted', pulse: false })).toBe(
      'Змінні — не опубліковано',
    )
    expect(texts.notPublished).toBe('Не опубліковано')
    expect(pillHint('uk', 'Змінні', { label: 'тест', tone: 'muted', pulse: false })).toBe(
      'Змінні — тест',
    )
  })

  it('lower-cases a material\'s phase word after the dash too, leaving the vocabulary as it is', () => {
    const ready = phaseVocab('uk', 'ready')
    expect(pillHint('uk', 'lecture.md', ready)).toBe('lecture.md — готово')
    expect(ready.label).toBe('Готово')
  })

  it('gives the panel the editor\'s chips: two for changed, none when the tree does not say', () => {
    expect(testStateChips('uk', 'draft')).toEqual([testStateVocab('uk', 'draft')])
    expect(testStateChips('uk', 'published')).toEqual([testStateVocab('uk', 'published')])
    expect(testStateChips('uk', 'changed')).toEqual([
      testStateVocab('uk', 'published'),
      testStateVocab('uk', 'changed'),
    ])
    expect(testStateChips('uk', null)).toEqual([])
    expect(testStateChips('uk', undefined)).toEqual([])
  })
})

describe('phase colour resolvers', () => {
  it('emits the pulse only for the pulsing phase (processing)', () => {
    expect(phaseBadgeClass(phaseVocab('uk', 'processing'))).toContain('animate-pulse-soft')
    expect(phaseBadgeClass(phaseVocab('uk', 'queued'))).not.toContain('animate-pulse-soft')
    expect(phasePillClass(phaseVocab('uk', 'processing'))).toContain('animate-pulse-soft')
    expect(phasePillClass(phaseVocab('uk', 'queued'))).not.toContain('animate-pulse-soft')
  })

  it('maps awaiting to navy on both surfaces', () => {
    expect(phaseBadgeClass(phaseVocab('uk', 'awaiting_author'))).toContain('navy')
    expect(phasePillClass(phaseVocab('uk', 'awaiting_author'))).toContain('navy')
  })
})

describe('JOB_STATE_LABEL — work-state axis', () => {
  it('covers exactly the six job-state tokens, no more no less', () => {
    const labels = ALL_JOB_STATES.map((s) => jobStateLabel('uk', s))
    expect(labels.length).toBe(ALL_JOB_STATES.length)
  })

  it('gives every job state a non-empty distinct label', () => {
    const labels = ALL_JOB_STATES.map((s) => jobStateLabel('uk', s))
    labels.forEach((l) => expect(l.length).toBeGreaterThan(0))
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('ratified words (§2), incl. the two that differ from the raw JobStatus map', () => {
    expect(jobStateLabel('uk', 'queued')).toBe('У черзі')
    expect(jobStateLabel('uk', 'processing')).toBe('Обробляється')
    expect(jobStateLabel('uk', 'ready')).toBe('Готово')
    expect(jobStateLabel('uk', 'error')).toBe('Помилка')
    expect(jobStateLabel('uk', 'cancelled')).toBe('Скасовано')
    expect(jobStateLabel('uk', 'obsolete')).toBe('Застаріло')
  })
})

describe('jobStateWordClass — two-axis formula (§3, four buckets)', () => {
  it('is total over the six job-state tokens (never empty)', () => {
    ALL_JOB_STATES.forEach((s) => {
      expect(jobStateWordClass(s).length).toBeGreaterThan(0)
    })
  })

  // Bucket 1 — motion ONLY for the running work ("happening now").
  it('moves only processing, never the queue', () => {
    expect(jobStateWordClass('processing')).toContain('animate-pulse-soft')
    expect(jobStateWordClass('queued')).not.toContain('animate-pulse-soft')
  })

  // Bucket 2 — queued is a calm word: no motion AND no muting (work is ahead).
  it('keeps the queue calm — no motion, no muting, no chip', () => {
    const cls = jobStateWordClass('queued')
    expect(cls).not.toContain('animate-pulse-soft')
    expect(cls).not.toContain('text-ink-muted')
    expect(cls).not.toContain('bg-')
  })

  // Bucket 3 — a finished job is muted and never pulses.
  it('mutes a finished job and never pulses it', () => {
    for (const s of ['ready', 'cancelled', 'obsolete'] as JobState[]) {
      expect(jobStateWordClass(s)).toContain('text-ink-muted')
      expect(jobStateWordClass(s)).not.toContain('animate-pulse-soft')
    }
  })

  // Bucket 4 — an error speaks the alarm colour as text, not a chip fill.
  it('speaks an error in the alarm colour as text, not a chip fill', () => {
    const cls = jobStateWordClass('error')
    expect(cls).toContain('text-coral')
    expect(cls).not.toContain('bg-') // colour is on the word, never a filled chip
    expect(cls).not.toContain('animate-pulse-soft')
  })
})

describe('JOB_KIND_LABEL — work-kind axis (§7 Г4)', () => {
  it('covers exactly the four author job-kind tokens, no more no less', () => {
    const labels = ALL_AUTHOR_JOB_TYPES.map((t) => jobKindLabel('uk', t))
    expect(labels.length).toBe(ALL_AUTHOR_JOB_TYPES.length)
  })

  it('gives every job kind a non-empty distinct label', () => {
    const labels = ALL_AUTHOR_JOB_TYPES.map((t) => jobKindLabel('uk', t))
    labels.forEach((l) => expect(l.length).toBeGreaterThan(0))
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('ratified words (§7 Г4)', () => {
    expect(jobKindLabel('uk', 'document_processing')).toBe('Обробка матеріалу')
    expect(jobKindLabel('uk', 'document_preparation')).toBe('Підготовка матеріалу')
    expect(jobKindLabel('uk', 'base_normalize')).toBe('Підготовка проєкту')
    expect(jobKindLabel('uk', 'node_summary_regeneration')).toBe('Оновлення підсумку теми')
  })

  // No internal terminology (§7 Г4 / language-rules): a raw job_type token is
  // snake_case Latin, so any Latin letter or underscore in a label is a leak.
  it('carries no internal terminology (no Latin/underscore raw-token leak)', () => {
    ALL_AUTHOR_JOB_TYPES.forEach((t) => {
      expect(jobKindLabel('uk', t)).not.toMatch(/[A-Za-z_]/)
    })
  })
})
