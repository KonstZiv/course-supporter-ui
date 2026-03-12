import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { FolderOpen, Paperclip } from 'lucide-react'
import type { FlowNodeData } from '../../../utils/treeToFlow'

export const SectionNode = memo(function SectionNode({
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) {
  const hasError = data.materials.some((m) => m.state === 'error')
  const hasPending = data.materials.some((m) => m.state === 'pending')
  const allReady = data.materials.length > 0 && data.materials.every((m) => m.state === 'ready')

  let borderColor = 'border-transparent'
  if (selected) borderColor = 'border-navy'
  else if (hasError) borderColor = 'border-coral/40'
  else if (allReady) borderColor = 'border-forest/30'

  return (
    <div
      className={`
        w-[280px] bg-white rounded-2xl shadow-card p-4
        border-2 transition-all duration-200 cursor-pointer
        ${borderColor}
        ${selected ? 'shadow-card-lg scale-[1.02]' : 'hover:shadow-card-lg'}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-navy !w-2.5 !h-2.5 !border-2 !border-white" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
          ${allReady ? 'bg-forest-pale' : hasPending ? 'bg-amber-pale' : 'bg-navy-pale'}
        `}>
          <FolderOpen size={16} className={allReady ? 'text-forest' : hasPending ? 'text-amber' : 'text-navy'} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm text-ink leading-snug truncate">
            {data.title}
          </h4>
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
                inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium
                ${m.state === 'ready' ? 'bg-forest-pale text-forest' : ''}
                ${m.state === 'pending' ? 'bg-amber-pale text-amber-dark animate-pulse-soft' : ''}
                ${m.state === 'error' ? 'bg-coral-pale text-coral' : ''}
                ${m.state === 'raw' ? 'bg-canvas-dark text-ink-muted' : ''}
                ${m.state === 'integrity_broken' ? 'bg-coral-pale text-coral' : ''}
              `}
              title={`${m.filename || m.source_url || m.source_type} — ${m.state}`}
            >
              <Paperclip size={10} />
              {m.filename?.slice(0, 14) || m.source_url?.slice(0, 14) || m.source_type}
            </span>
          ))}
          {data.materials.length > 5 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-canvas-dark text-ink-muted">
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

      <Handle type="source" position={Position.Bottom} className="!bg-navy !w-2.5 !h-2.5 !border-2 !border-white" />
    </div>
  )
})
