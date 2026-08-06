import { clsx } from 'clsx'
import type { ProcessingPhase, JobState } from '../types/api'

// Single source of the author-facing state vocabulary — one map per axis
// (TASK-B §2). Every surface that shows a state axis reads its word (and, for
// the phase axis, its colour) from here; no surface hard-codes a status word or
// re-derives the colour ladder inline.
//
// Two axes, deliberately separate (PROBE-B / ARC.md §1 Р8):
//   * ProcessingPhase — the canonical axis of a MATERIAL (five values).
//   * JobState        — the work-state of a Job ROW (six values); never carries
//                       ``awaiting_author`` (that is material-only).

// Semantic colour identity of a phase, shared across every phase surface (badge
// + section pill + root pill). Each surface owns its visual density; the tone +
// pulse identity lives here once. ``queued`` and ``processing`` share the
// ``busy`` tone (amber) and differ ONLY by the pulse — "amber = busy, pulse =
// active" (PROBE-B q6). ``muted`` is the forward-compat fallback tone, never a
// real phase.
export type PhaseTone = 'busy' | 'awaiting' | 'ready' | 'error' | 'muted'

export interface PhaseVocabEntry {
  label: string
  tone: PhaseTone
  pulse: boolean
}

// Material phase axis — five values, five Ukrainian words (TASK-B §2).
export const PHASE_VOCAB: Record<ProcessingPhase, PhaseVocabEntry> = {
  queued: { label: 'У черзі', tone: 'busy', pulse: false },
  processing: { label: 'Обробляється', tone: 'busy', pulse: true },
  awaiting_author: { label: 'Очікує підтвердження', tone: 'awaiting', pulse: false },
  ready: { label: 'Готово', tone: 'ready', pulse: false },
  error: { label: 'Помилка', tone: 'error', pulse: false },
}

// A phase the FE does not know yet renders as a muted neutral chip — never a raw
// token, never a crash (mirrors the pre-B tolerance for an unknown phase).
const UNKNOWN_PHASE: PhaseVocabEntry = { label: '—', tone: 'muted', pulse: false }

/** Total lookup: a known phase → its entry, anything else → the muted fallback. */
export function phaseVocab(phase: ProcessingPhase): PhaseVocabEntry {
  return PHASE_VOCAB[phase] ?? UNKNOWN_PHASE
}

// Work-state axis — six values, words only. Its single surface (RunStatePanel)
// keeps its own colours (§2 job table carries no colour column).
export const JOB_STATE_LABEL: Record<JobState, string> = {
  queued: 'У черзі',
  processing: 'Обробляється',
  ready: 'Готово',
  error: 'Помилка',
  cancelled: 'Скасовано',
  obsolete: 'Застаріло',
}

// ── Phase colour resolvers (tone → surface classes) ──
//
// The tone→class ladder lives here once per surface density, so the badge and
// both canvas pills stop each carrying their own copy (§2).

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
