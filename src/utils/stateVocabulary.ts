import { clsx } from 'clsx'
import type { ProcessingPhase, JobState, AuthorJobType } from '../types/api'

// Single source of the author-facing vocabulary — one map per axis (TASK-B §2,
// step Г Г4). Every surface that shows an axis reads its word (and, for the
// phase axis, its colour) from here; no surface hard-codes a status word or
// re-derives the colour ladder inline.
//
// Three axes, deliberately separate (PROBE-B / ARC.md §1 Р8, §7 Г4):
//   * ProcessingPhase — the STATE axis of a MATERIAL (five values).
//   * JobState        — the work-STATE of a Job ROW (six values); never carries
//                       ``awaiting_author`` (that is material-only).
//   * AuthorJobType   — the KIND of a Job ROW (four author-facing values): not
//                       "in what state" but "what kind of work" (§7 Г4).

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

// Work-kind axis — the four author-facing job kinds (AuthorJobType), one word
// each (§7 Г4). Not "in what state" but "what kind of work". History needs it:
// a deleted material is told apart only by its date and the KIND of work over it
// (Р7), so a missing kind word makes two deleted materials indistinguishable.
// Total over AuthorJobType — homework/cleanup never reach the author doors and
// are not in the union.
export const JOB_KIND_LABEL: Record<AuthorJobType, string> = {
  document_processing: 'Обробка матеріалу',
  document_preparation: 'Підготовка матеріалу',
  base_normalize: 'Підготовка проєкту',
  node_summary_regeneration: 'Оновлення підсумку теми',
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

// ── Work-state axis treatment (В1 / TASK-V §3) ──
//
// The two-axis formula: colour belongs to the material, the WORD to the work, so
// the work-state word never gets a filled chip. Four buckets on the word:
//   * ``processing`` — motion (the pulse that means "something is happening NOW");
//   * ``queued``     — a calm word: no motion, no muting (the work is still ahead);
//   * finished (``ready`` / ``cancelled`` / ``obsolete``) — muted;
//   * ``error``      — the alarm colour AS TEXT.
// Motion is reserved for "happening now", not "still alive" (ratified 2026-08-07):
// the phase axis already splits queue from processing by the pulse, so pulsing the
// queue here would move the strip while the material chip stayed calm about the
// same moment — two truths about one moment (Р2). Lives beside the phase resolvers
// so the second axis stays in the one vocabulary module (§3 / §5), not inline.
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
