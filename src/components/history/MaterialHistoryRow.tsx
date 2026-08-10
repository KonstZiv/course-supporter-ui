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
import {
  deletedMaterialLabelShort,
  deletedMaterialAuthorLine,
} from '../../utils/materialLabel'
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

// The material NAME — THREE separate cases (Г2), split by the deletion flag, NEVER
// by name emptiness (Г7): a deleted material with no stored name still reads as
// deleted; a live material with no stored name reads as "Без назви". The phase
// chip is NOT here — it lives in its own column (Г8 п.5), so names align on one
// left edge regardless of whether a chip is present.
function MaterialName({ item }: { item: MaterialHistoryItemResponse }) {
  // No ``truncate`` (which carries ``white-space: nowrap``): the name WRAPS like the
  // students-table sample, so a long name never forces the material column past the
  // card and clips the row (Г8 п.6).
  if (item.material_deleted) {
    // Г9: the SAME verbatim words (Г3), laid out as two lines so the marker's
    // natural width falls to a normal name's — the FACT, then the author + moment
    // smaller and dimmer. ``leading-tight`` keeps the two-line row from towering
    // over the one-line rows; the second line is the row's only planned wrap.
    return (
      <span className="flex flex-col leading-tight text-ink-muted">
        <span>{deletedMaterialLabelShort()}</span>
        <span className="text-xs text-ink-muted/70">
          {deletedMaterialAuthorLine(item.material_deleted_at ?? '')}
        </span>
      </span>
    )
  }
  if (item.display_name) {
    return <span>{item.display_name}</span>
  }
  return <span className="italic text-ink-muted">Без назви</span>
}

// One collapsed material row of the history page (§3 c4, columns split in the Г8
// visual pass). Both state axes still meet on one line but in SEPARATE columns:
// the phase CHIP (material, colour, В1) has its own "Стан" column, the work-state
// WORD (last work, no chip) sits in "Остання робота". Different carriers on
// purpose — a merge would read as one axis. Splitting the chip out of the name
// cell aligns every name on one left edge (Г8 п.5) without an empty chip node in a
// deleted row (Г2 stays: the deleted material's "Стан" cell is simply empty).
//
// Presentational only: it takes the row plus the expansion props and returns
// markup — no state, no fetch. Expansion is wired from outside in c6.
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
      {/* Матеріал — chevron + source icon + name (NO chip; the chip is its own
          column, so names align on one left edge, Г8 п.5). */}
      <td className="px-4 py-3 align-middle">
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
          <MaterialName item={item} />
        </button>
      </td>
      {/* Стан — the material phase chip; a deleted material's cell is empty (Г2). */}
      <td className="px-4 py-3 align-middle">
        {!item.material_deleted && <PhaseChip phase={item.processing_phase} />}
      </td>
      {/* Остання робота — kind + state word. A REAL space between the two spans
          (JSX drops inter-tag whitespace, so the ratified ml-2 gap gave no break
          point — "матеріалуГотово" stayed one unbreakable token and overflowed the
          fixed column into the count on narrow, Г11). The space both breaks and
          spaces; the state word stays distinct by weight + colour (В1). */}
      <td className="px-4 py-3 align-middle">
        <span className="text-ink-light">{JOB_KIND_LABEL[last.job_type]}</span>{' '}
        <span className={clsx('font-medium', jobStateWordClass(last.job_state))}>
          {JOB_STATE_LABEL[last.job_state]}
        </span>
      </td>
      {/* Робіт — a count, centred in its own column so it never crowds the
          Остання робота text on its left when that wraps to several lines (Г11): a
          left-hugged digit beside a multi-line neighbour reads as part of it. */}
      <td className="px-4 py-3 align-middle text-center text-ink-light">
        {item.jobs_count}
      </td>
      <td className="px-4 py-3 align-middle text-ink-muted text-sm">{when}</td>
    </tr>
  )
}
