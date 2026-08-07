import { memo } from 'react'
import { clsx } from 'clsx'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FolderOpen, Paperclip } from 'lucide-react'
import type { FlowNodeData } from '../../../utils/treeToFlow'
import { SummaryBadge } from '../SummaryBadge'
import { phaseVocab, phasePillClass } from '../../../utils/stateVocabulary'

export const SectionNode = memo(function SectionNode({
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) {
  const docs = data.authored_documents
  const hasError = docs.some((m) => m.processing_phase === 'error')
  const hasAwaiting = docs.some((m) => m.processing_phase === 'awaiting_author')
  const hasBusy = docs.some(
    (m) => m.processing_phase === 'queued' || m.processing_phase === 'processing',
  )
  const allReady = docs.length > 0 && docs.every((m) => m.processing_phase === 'ready')

  // Aggregate border/icon priority on the phase axis (TASK-B §2, ratified
  // 2026-08-06): error > awaiting-author > busy (queued|processing) > ready;
  // the navy/30 fallback stays the empty node. Full navy for awaiting is a
  // deliberate visible change — a section whose only unsettled material waits on
  // the author must not read as green "done" (the per-material pills already
  // show navy). Priority "awaiting above busy" is intentional: processing ends
  // on its own, awaiting does not; the mix is visible in the pills.
  let accentColor = 'border-l-navy/30'
  if (hasError) accentColor = 'border-l-coral'
  else if (hasAwaiting) accentColor = 'border-l-navy'
  else if (hasBusy) accentColor = 'border-l-amber'
  else if (allReady) accentColor = 'border-l-forest'

  return (
    <div
      className={`
        w-[280px] bg-white rounded-xl p-4 relative
        border-l-[3px] ${accentColor} border border-transparent
        transition-all duration-200 cursor-pointer
        ${selected
          ? 'shadow-card-lg ring-2 ring-navy/15 scale-[1.01]'
          : 'shadow-card hover:shadow-card-lg'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-navy/30 !w-2 !h-2 !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className={`
          w-7 h-7 rounded-lg flex items-center justify-center shrink-0
          ${allReady ? 'bg-forest/8' : hasBusy ? 'bg-amber/8' : 'bg-navy/6'}
        `}>
          <FolderOpen size={14} className={allReady ? 'text-forest' : hasBusy ? 'text-amber' : 'text-navy/60'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm text-ink leading-snug truncate">
              {data.title}
            </h4>
          </div>
          {data.description && (
            <p className="text-ink-muted text-xs mt-0.5 line-clamp-1">
              {data.description}
            </p>
          )}
          {data.summary_status !== 'none' && (
            <div className="mt-1">
              <SummaryBadge
                status={data.summary_status}
                materialsChanged={data.materials_changed}
              />
            </div>
          )}
        </div>
      </div>

      {/* Materials */}
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {docs.slice(0, 5).map((m) => {
            const v = phaseVocab(m.processing_phase)
            return (
              <span
                key={m.id}
                className={clsx(
                  'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium',
                  phasePillClass(v),
                )}
                title={`${m.filename || m.source_url || m.source_type} — ${v.label}`}
              >
                <Paperclip size={9} />
                {m.filename?.slice(0, 14) || m.source_url?.slice(0, 14) || m.source_type}
              </span>
            )
          })}
          {docs.length > 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-canvas-dark/60 text-ink-muted">
              +{docs.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer stats */}
      {data.childrenCount > 0 && (
        <div className="text-[11px] text-ink-muted mt-2">
          {data.childrenCount} підрозділів
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-navy/30 !w-2 !h-2 !border-2 !border-white" />
    </div>
  )
})
