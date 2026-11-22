import { clsx } from 'clsx'
import type { ProcessingPhase, JobState, AuthorJobType, TestState } from '../types/api'
import { editorTexts } from '../components/testEditor/editorTexts'
import type { Tone } from '../components/testEditor/Chip'
import type { Language } from '../i18n/languages'
import { localeOf } from '../i18n/languages'
import { translate, type MessageKey } from '../i18n/translate'

export type PhaseTone = 'busy' | 'awaiting' | 'ready' | 'error' | 'muted'

export interface PhaseVocabEntry {
  label: string
  tone: PhaseTone
  pulse: boolean
}

const PHASE_LABEL_KEYS: Record<ProcessingPhase, MessageKey> = {
  queued: 'panel.state.phase.queued',
  processing: 'panel.state.phase.processing',
  awaiting_author: 'panel.state.phase.awaitingAuthor',
  ready: 'panel.state.phase.ready',
  error: 'panel.state.phase.error',
}

const PHASE_METADATA: Record<ProcessingPhase, { tone: PhaseTone; pulse: boolean }> = {
  queued: { tone: 'busy', pulse: false },
  processing: { tone: 'busy', pulse: true },
  awaiting_author: { tone: 'awaiting', pulse: false },
  ready: { tone: 'ready', pulse: false },
  error: { tone: 'error', pulse: false },
}

export const UNKNOWN_PHASE: PhaseVocabEntry = { label: '—', tone: 'muted', pulse: false }

/** Total lookup: a known phase → its entry, anything else → the muted fallback. */
export function phaseVocab(language: Language, phase: ProcessingPhase): PhaseVocabEntry {
  const meta = PHASE_METADATA[phase]
  const key = PHASE_LABEL_KEYS[phase]
  if (!meta || !key) return UNKNOWN_PHASE
  return {
    label: translate(language, key),
    tone: meta.tone,
    pulse: meta.pulse,
  }
}

export interface TestStateVocabEntry {
  label: string
  // The hint the editor's own chip carries for this state, if any.
  hint?: string
  // The editor's chip tone (``EditorToolbar``) …
  chipTone: Tone
  // … and the same colour on the canvas pill's ladder: neutral ↔ muted,
  // forest ↔ ready, navy ↔ awaiting (the same pale/ink pairs).
  pillTone: PhaseTone
}

function buildTestStateVocab(language: Language): Record<TestState, TestStateVocabEntry> {
  const texts = editorTexts(language)
  return {
    draft: { label: texts.notPublished, chipTone: 'neutral', pillTone: 'muted' },
    published: {
      label: texts.published,
      hint: texts.publishedHint,
      chipTone: 'forest',
      pillTone: 'ready',
    },
    changed: {
      label: texts.unpublishedChanges,
      hint: texts.unpublishedChangesHint,
      chipTone: 'navy',
      pillTone: 'awaiting',
    },
  }
}

/** A test's state entry, or ``null`` when the tree does not say (absent/null/unknown). */
export function testStateVocab(
  language: Language,
  state: TestState | null | undefined,
): TestStateVocabEntry | null {
  return (state && buildTestStateVocab(language)[state]) || null
}

function buildTestStateChips(language: Language): Record<TestState, TestStateVocabEntry[]> {
  const vocab = buildTestStateVocab(language)
  return {
    draft: [vocab.draft],
    published: [vocab.published],
    changed: [vocab.published, vocab.changed],
  }
}

/** The editor's chips for a test's state, in its order; none when the tree does not say. */
export function testStateChips(
  language: Language,
  state: TestState | null | undefined,
): TestStateVocabEntry[] {
  return (state && buildTestStateChips(language)[state]) || []
}

/** A canvas pill's word and tone: a test's publication state, any other material's phase. */
export function pillVocab(
  language: Language,
  document: {
    source_type: string
    processing_phase: ProcessingPhase
    test_state?: TestState | null
  },
): PhaseVocabEntry {
  if (document.source_type !== 'test_object') return phaseVocab(language, document.processing_phase)
  const state = testStateVocab(language, document.test_state)
  return state === null
    ? { label: translate(language, 'panel.state.test'), tone: 'muted', pulse: false }
    : { label: state.label, tone: state.pillTone, pulse: false }
}

const JOB_STATE_KEYS: Record<JobState, MessageKey> = {
  queued: 'panel.state.job.queued',
  processing: 'panel.state.job.processing',
  ready: 'panel.state.job.ready',
  error: 'panel.state.job.error',
  cancelled: 'panel.state.job.cancelled',
  obsolete: 'panel.state.job.obsolete',
}

export function jobStateLabel(language: Language, state: JobState): string {
  const key = JOB_STATE_KEYS[state]
  return key ? translate(language, key) : state
}

const JOB_KIND_KEYS: Record<AuthorJobType, MessageKey> = {
  document_processing: 'panel.state.kind.documentProcessing',
  document_preparation: 'panel.state.kind.documentPreparation',
  base_normalize: 'panel.state.kind.baseNormalize',
  node_summary_regeneration: 'panel.state.kind.nodeSummaryRegeneration',
}

export function jobKindLabel(language: Language, kind: AuthorJobType): string {
  const key = JOB_KIND_KEYS[kind]
  return key ? translate(language, key) : kind
}

const PHASE_BADGE_TONE: Record<PhaseTone, string> = {
  busy: 'bg-amber-pale text-amber-dark',
  awaiting: 'bg-navy-pale text-navy',
  ready: 'bg-forest-pale text-forest',
  error: 'bg-coral-pale text-coral',
  muted: 'bg-canvas-dark text-ink-muted',
}

const PHASE_PILL_TONE: Record<PhaseTone, string> = {
  busy: 'bg-amber/10 text-amber-dark',
  awaiting: 'bg-navy/10 text-navy',
  ready: 'bg-forest/8 text-forest',
  error: 'bg-coral/10 text-coral',
  muted: 'bg-canvas-dark text-ink-muted',
}

/** Badge chip colour classes (StatusBadge) — chunky ``-pale`` treatment. */
export function phaseBadgeClass(entry: PhaseVocabEntry): string {
  return clsx(PHASE_BADGE_TONE[entry.tone], entry.pulse && 'animate-pulse-soft')
}

/** Canvas pill colour classes (section + root pills) — thin ``/N`` treatment. */
export function phasePillClass(entry: PhaseVocabEntry): string {
  return clsx(PHASE_PILL_TONE[entry.tone], entry.pulse && 'animate-pulse-soft')
}

const JOB_STATE_WORD_TONE: Record<JobState, string> = {
  queued: 'text-ink',
  processing: 'text-ink animate-pulse-soft',
  ready: 'text-ink-muted',
  cancelled: 'text-ink-muted',
  obsolete: 'text-ink-muted',
  error: 'text-coral',
}

/** Work-state word classes (strip rows) — colour/motion on the word, never a chip. */
export function jobStateWordClass(state: JobState): string {
  return JOB_STATE_WORD_TONE[state]
}

/**
 * A canvas pill's hint: «{name} — {state}».
 */
export function pillHint(language: Language, name: string, entry: PhaseVocabEntry): string {
  const state = entry.label.charAt(0).toLocaleLowerCase(localeOf(language)) + entry.label.slice(1)
  return `${name} — ${state}`
}
