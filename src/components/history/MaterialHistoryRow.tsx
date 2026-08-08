import { clsx } from 'clsx'
import {
  ChevronDown,
  ChevronRight,
  Video,
  FileImage,
  FileText,
  Globe,
  AudioLines,
  FileCode,
  File as FileIcon,
} from 'lucide-react'
import type {
  MaterialHistoryItemResponse,
  ProcessingPhase,
} from '../../types/api'
import { StatusBadge } from '../ui/StatusBadge'
import {
  JOB_STATE_LABEL,
  JOB_KIND_LABEL,
  jobStateWordClass,
} from '../../utils/stateVocabulary'
import { deletedMaterialLabelFull } from '../../utils/materialLabel'
import { relativeTime } from '../../utils/relativeTime'
import { sourceTypeMeta } from '../../utils/sourceTypeIcon'

// Icon-name → component, curated to keep the bundle small (same pattern as
// NodeDetailPanel). Total over the six names sourceTypeMeta can return; anything
// else falls to the generic file icon.
const ICON_BY_NAME: Record<string, typeof FileIcon> = {
  Video,
  FileImage,
  FileText,
  Globe,
  AudioLines,
  FileCode,
  File: FileIcon,
}

// The phase chip — the В1 "colour belongs to the material" carrier. Wrapped so a
// deleted row can omit the NODE entirely (Г2/Г3: absence, not an empty chip);
// returns null for a missing phase (defensive — a live material always has one).
function PhaseChip({ phase }: { phase: ProcessingPhase | null }) {
  if (!phase) return null
  return (
    <span data-testid="phase-chip">
      <StatusBadge phase={phase} />
    </span>
  )
}

// The material identity — THREE separate cases (Г2), split by the deletion flag,
// NEVER by name emptiness (Г7): a deleted material with no stored name still reads
// as deleted; a live material with no stored name reads as "Без назви".
function MaterialIdentity({ item }: { item: MaterialHistoryItemResponse }) {
  // Case 3 — deleted: no phase chip at all; the full deletion label in place of
  // the name. The material is gone, only its work trail remains.
  if (item.material_deleted) {
    return (
      <span className="truncate text-ink-muted">
        {deletedMaterialLabelFull(item.material_deleted_at ?? '')}
      </span>
    )
  }
  // Case 1 — live + named.
  if (item.display_name) {
    return (
      <>
        <PhaseChip phase={item.processing_phase} />
        <span className="truncate">{item.display_name}</span>
      </>
    )
  }
  // Case 2 — live + unnamed.
  return (
    <>
      <PhaseChip phase={item.processing_phase} />
      <span className="truncate italic text-ink-muted">Без назви</span>
    </>
  )
}

// One collapsed material row of the history page (§3 c4) — the FIRST place both
// state axes meet on one line: the phase CHIP carries the material (colour, В1),
// the work-state WORD carries the last work (no chip, jobStateWordClass). They
// stay different carriers on purpose — a merge would read as a single axis.
//
// Presentational only: it takes the row plus the expansion props and returns
// markup — no state, no fetch. Expansion (its state and lazy load) is wired from
// outside in c6.
export function MaterialHistoryRow({
  item,
  now,
  expanded = false,
  onToggle,
}: {
  item: MaterialHistoryItemResponse
  now: number
  expanded?: boolean
  onToggle?: () => void
}) {
  const last = item.last_job
  const when = relativeTime(last.completed_at ?? last.queued_at, now)
  const meta = item.material_source_type
    ? sourceTypeMeta(item.material_source_type)
    : null
  const SourceIcon = meta ? (ICON_BY_NAME[meta.icon] ?? FileIcon) : null

  return (
    <tr className="border-t border-canvas-dark/40">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex items-center gap-2 min-w-0 text-left w-full"
        >
          <span className="shrink-0 text-ink-muted">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          {SourceIcon && meta && (
            <SourceIcon
              size={16}
              role="img"
              aria-label={meta.label}
              className={clsx('shrink-0', meta.color)}
            />
          )}
          <MaterialIdentity item={item} />
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-ink-light">{JOB_KIND_LABEL[last.job_type]}</span>
        <span
          className={clsx('ml-2 font-medium', jobStateWordClass(last.job_state))}
        >
          {JOB_STATE_LABEL[last.job_state]}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-light">{item.jobs_count}</td>
      <td className="px-4 py-3 text-ink-muted text-sm whitespace-nowrap">
        {when}
      </td>
    </tr>
  )
}
