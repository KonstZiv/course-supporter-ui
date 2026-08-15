import type { JobListItemResponse } from '../types/api'

// The unit kind is INTERNAL (Д5/Е6): the token never leaves. The render composes
// the product-language caption via progressCaption — "кадр N з M" / "вузол N з M"
// for processing, "45 МБ з 320 МБ" for the upload bar (Е6, same primitive).
export type ProgressUnit = 'frame' | 'node' | 'byte'

// The word-bearing units; 'byte' has no word — it reads as an MB amount (Е6).
type WordUnit = Exclude<ProgressUnit, 'byte'>

export interface WorkProgressBar {
  current: number
  total: number
  unit: ProgressUnit
}

const PROGRESS_UNIT_WORD: Record<WordUnit, string> = {
  frame: 'кадр',
  node: 'вузол',
}

/** Product-language unit word for the frame/node caption (Д5). */
export function progressUnitWord(unit: WordUnit): string {
  return PROGRESS_UNIT_WORD[unit]
}

const BYTES_PER_MB = 1024 * 1024

/**
 * Upload-bar caption in MB (Е6/Е8): "45 МБ з 320 МБ". The unit is always MB —
 * the upload cap is a gigabyte, so the numbers stay readable — and a file under
 * a megabyte reads "менше 1 МБ" (no meaningful MB split).
 */
export function formatUploadCaption(
  loadedBytes: number,
  totalBytes: number,
): string {
  if (totalBytes < BYTES_PER_MB) return 'менше 1 МБ'
  return `${Math.round(loadedBytes / BYTES_PER_MB)} МБ з ${Math.round(
    totalBytes / BYTES_PER_MB,
  )} МБ`
}

/** Caption for the shared meter: MB for bytes, "{word} N з M" for frame/node. */
export function progressCaption({
  current,
  total,
  unit,
}: WorkProgressBar): string {
  if (unit === 'byte') return formatUploadCaption(current, total)
  return `${progressUnitWord(unit)} ${current} з ${total}`
}

// Д3 — the ONE place the node-summary denominator is derived (invariant #5).
// The run stores per-node status maps for both passes but no counter; the
// denominator is every node visit the run will make, the numerator every visit
// already resolved (anything not 'pending'). Counted across BOTH passes
// together — not per pass — so the bar does not fill to the end and restart
// when pass 2 begins (Д3 second condition). Two places counting this would be
// two numbers about one thing (Р4), so every surface reads this result.
export interface NodeVisitTally {
  done: number
  total: number
}

function isStatusMap(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

export function nodeVisitTally(stageProgress: Record<string, unknown>): NodeVisitTally | null {
  const { pass1, pass2, scope } = stageProgress
  if (!isStatusMap(pass1) || !isStatusMap(pass2)) return null

  // Д3 — the denominator is STABLE at 2 × node count, known from the run scope.
  // It must NOT be ``len(pass1) + len(pass2)``: pass2 starts EMPTY and fills only
  // when topdown begins, so that sum grows 9 → 18 mid-run, the bar fills during
  // bottomup and then jumps back — exactly the restart Д3 forbids. The node
  // count comes from ``scope.in_scope_node_ids`` (populated at scope-validation,
  // the run's first step); the fallback (max of the two pre-populated pass maps)
  // holds the same stable value when the scope is absent.
  const inScope = isStatusMap(scope) ? scope.in_scope_node_ids : undefined
  const nodeCount =
    Array.isArray(inScope) && inScope.length > 0
      ? inScope.length
      : Math.max(Object.keys(pass1).length, Object.keys(pass2).length)
  const total = nodeCount * 2
  if (total <= 0) return null

  let done = 0
  for (const map of [pass1, pass2]) {
    for (const status of Object.values(map)) {
      if (status !== 'pending') done += 1
    }
  }
  return { done, total }
}

function videoFrameBar(
  stageProgress: Record<string, unknown>,
  currentStage: string | null,
): WorkProgressBar | null {
  // Video writes {stage:'detecting', current, total, unit:'frames'} only during
  // frame detection. Draw the bar ONLY while current_stage still IS that stage
  // (Д2): once it advances, the frozen counter is a stale full bar.
  if (stageProgress.stage !== 'detecting' || currentStage !== 'detecting') return null
  const { current, total } = stageProgress
  if (typeof current !== 'number' || typeof total !== 'number' || total <= 0) return null
  return { current, total, unit: 'frame' }
}

function nodeSummaryBar(
  stageProgress: Record<string, unknown>,
  currentStage: string | null,
): WorkProgressBar | null {
  // Draw only while a pass is executing (current_stage bottomup/topdown); the
  // denominator is derived once, here, from the pass maps (Д3).
  if (currentStage !== 'bottomup' && currentStage !== 'topdown') return null
  const tally = nodeVisitTally(stageProgress)
  if (!tally || tally.total <= 0) return null
  return { current: tally.done, total: tally.total, unit: 'node' }
}

// Д2 — the bar is shown ONLY while the saved progress describes the stage that
// is running NOW, and the work is live. Saved progress FREEZES after its stage
// (video writes the frame counter only during detection; later stages leave it
// at current==total) and it survives terminal — so reading it as "current
// activity" without this check paints a full bar over work that is still
// running, or over finished work. Everything else is words + duration.
//
// The form is discriminated by the sibling job_type, never by key presence
// (§Q2): document_processing → the frame counter (video only, else null),
// node_summary_regeneration → the derived node tally. The other two kinds
// (document_preparation, base_normalize) never carry a denominator.
export function workProgressBar(job: JobListItemResponse): WorkProgressBar | null {
  if (job.job_state !== 'processing') return null
  const sp = job.stage_progress
  if (!sp) return null
  if (job.job_type === 'document_processing') return videoFrameBar(sp, job.current_stage)
  if (job.job_type === 'node_summary_regeneration') return nodeSummaryBar(sp, job.current_stage)
  return null
}
