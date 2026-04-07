import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FolderOpen, Paperclip, Loader2 } from 'lucide-react'
import type { FlowNodeData } from '../../../utils/treeToFlow'

function ReconciliationDot({ freshness, polling }: { freshness?: string | null; polling?: boolean }) {
  if (polling) {
    return <Loader2 size={12} className="animate-spin text-navy shrink-0" />
  }
  if (freshness === 'fresh') {
    return <span className="w-2 h-2 rounded-full bg-forest shrink-0" title="Узгодження актуальне" />
  }
  if (freshness?.startsWith('stale')) {
    return <span className="w-2 h-2 rounded-full bg-amber shrink-0" title="Узгодження застаріло" />
  }
  return null
}

export const SectionNode = memo(function SectionNode({
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) {
  const hasError = data.materials.some((m) => m.state === 'error')
  const hasPending = data.materials.some((m) => m.state === 'pending')
  const allReady = data.materials.length > 0 && data.materials.every((m) => m.state === 'ready')

  let accentColor = 'border-l-navy/30'
  if (hasError) accentColor = 'border-l-coral'
  else if (allReady) accentColor = 'border-l-forest'
  else if (hasPending) accentColor = 'border-l-amber'

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

      {/* Reconciliation polling overlay */}
      {data.reconciliationPolling && (
        <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-xs text-navy">
            <Loader2 size={16} className="animate-spin" />
            <span>Іде узгодження...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className={`
          w-7 h-7 rounded-lg flex items-center justify-center shrink-0
          ${allReady ? 'bg-forest/8' : hasPending ? 'bg-amber/8' : 'bg-navy/6'}
        `}>
          <FolderOpen size={14} className={allReady ? 'text-forest' : hasPending ? 'text-amber' : 'text-navy/60'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-medium text-sm text-ink leading-snug truncate">
              {data.title}
            </h4>
            <ReconciliationDot freshness={data.reconciliationFreshness} polling={data.reconciliationPolling} />
          </div>
          {data.description && (
            <p className="text-ink-muted text-xs mt-0.5 line-clamp-1">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Materials */}
      {data.materials.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.materials.slice(0, 5).map((m) => (
            <span
              key={m.id}
              className={`
                inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium
                ${m.state === 'ready' ? 'bg-forest/6 text-forest' : ''}
                ${m.state === 'pending' ? 'bg-amber/8 text-amber-dark animate-pulse-soft' : ''}
                ${m.state === 'error' ? 'bg-coral/8 text-coral' : ''}
                ${m.state === 'raw' ? 'bg-canvas-dark/60 text-ink-muted' : ''}
                ${m.state === 'integrity_broken' ? 'bg-coral/8 text-coral' : ''}
              `}
              title={`${m.filename || m.source_url || m.source_type} — ${m.state}`}
            >
              <Paperclip size={9} />
              {m.filename?.slice(0, 14) || m.source_url?.slice(0, 14) || m.source_type}
            </span>
          ))}
          {data.materials.length > 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-canvas-dark/60 text-ink-muted">
              +{data.materials.length - 5}
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
