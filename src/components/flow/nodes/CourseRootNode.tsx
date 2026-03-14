import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BookOpen, Layers, Paperclip, Loader2 } from 'lucide-react'
import type { FlowNodeData } from '../../../utils/treeToFlow'

function ReconciliationIndicator({ freshness, polling }: { freshness?: string | null; polling?: boolean }) {
  if (polling) {
    return <Loader2 size={14} className="animate-spin text-amber-light shrink-0" />
  }
  if (freshness === 'fresh') {
    return <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" title="Узгодження актуальне" />
  }
  if (freshness?.startsWith('stale')) {
    return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title="Узгодження застаріло" />
  }
  return null
}

export const CourseRootNode = memo(function CourseRootNode({
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) {
  return (
    <div
      className={`
        w-[320px] bg-gradient-to-br from-navy to-navy-dark
        rounded-2xl shadow-card-lg text-white p-5 relative
        border-2 transition-all duration-200 cursor-pointer
        ${selected ? 'border-amber shadow-glow scale-[1.02]' : 'border-transparent hover:border-amber/40'}
      `}
    >
      {/* Reconciliation polling overlay */}
      {data.reconciliationPolling && (
        <div className="absolute inset-0 bg-navy/50 rounded-2xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-xs text-white/90">
            <Loader2 size={16} className="animate-spin" />
            <span>Іде узгодження...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <BookOpen size={20} className="text-amber-light" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-lg leading-snug truncate">
              {data.title}
            </h3>
            <ReconciliationIndicator freshness={data.reconciliationFreshness} polling={data.reconciliationPolling} />
          </div>
          {data.description && (
            <p className="text-white/60 text-sm mt-0.5 line-clamp-2">
              {data.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-white/70">
        <span className="flex items-center gap-1.5">
          <Layers size={14} />
          {data.childrenCount} розділів
        </span>
        <span className="flex items-center gap-1.5">
          <Paperclip size={14} />
          {data.materials.length} матеріалів
        </span>
      </div>

      {/* Materials pills */}
      {data.materials.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.materials.slice(0, 4).map((m) => (
            <span
              key={m.id}
              className={`
                text-[11px] px-2 py-0.5 rounded-full font-medium
                ${m.state === 'ready' ? 'bg-white/20 text-white/90' : ''}
                ${m.state === 'pending' ? 'bg-amber/30 text-amber-light animate-pulse-soft' : ''}
                ${m.state === 'error' ? 'bg-coral/30 text-coral-light' : ''}
                ${m.state === 'raw' ? 'bg-white/10 text-white/50' : ''}
              `}
              title={m.filename || m.source_url || m.source_type}
            >
              {m.filename?.slice(0, 18) || m.source_url?.slice(0, 18) || m.source_type}
            </span>
          ))}
          {data.materials.length > 4 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              +{data.materials.length - 4}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-amber !w-3 !h-3 !border-2 !border-navy" />
    </div>
  )
})
