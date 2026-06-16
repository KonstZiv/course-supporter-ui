import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BookOpen, Layers, Paperclip } from 'lucide-react'
import type { FlowNodeData } from '../../../utils/treeToFlow'
import { SummaryBadge } from '../SummaryBadge'

export const CourseRootNode = memo(function CourseRootNode({
  data,
  selected,
}: NodeProps & { data: FlowNodeData }) {
  return (
    <div
      className={`
        w-[320px] bg-white rounded-2xl p-5 relative
        border-l-4 border-l-navy border border-transparent
        transition-all duration-200 cursor-pointer
        ${selected
          ? 'shadow-card-lg ring-2 ring-navy/20 scale-[1.01]'
          : 'shadow-card hover:shadow-card-lg'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-navy/8 flex items-center justify-center shrink-0">
          <BookOpen size={20} className="text-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-lg text-ink leading-snug truncate">
              {data.title}
            </h3>
          </div>
          {data.description && (
            <p className="text-ink-muted text-sm mt-0.5 line-clamp-2">
              {data.description}
            </p>
          )}
          {data.summary_status !== 'none' && (
            <div className="mt-1.5">
              <SummaryBadge
                status={data.summary_status}
                materialsChanged={data.materials_changed}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-ink-muted">
        <span className="flex items-center gap-1.5">
          <Layers size={14} />
          {data.childrenCount} розділів
        </span>
        <span className="flex items-center gap-1.5">
          <Paperclip size={14} />
          {data.authored_documents.length} документів
        </span>
      </div>

      {/* Materials pills */}
      {data.authored_documents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.authored_documents.slice(0, 4).map((m) => (
            <span
              key={m.id}
              className={`
                text-[11px] px-2 py-0.5 rounded-full font-medium
                ${m.state === 'ready' ? 'bg-forest/8 text-forest' : ''}
                ${m.state === 'pending' ? 'bg-amber/10 text-amber-dark animate-pulse-soft' : ''}
                ${m.state === 'error' ? 'bg-coral/10 text-coral' : ''}
                ${m.state === 'raw' ? 'bg-canvas-dark text-ink-muted' : ''}
              `}
              title={m.filename || m.source_url || m.source_type}
            >
              {m.filename?.slice(0, 18) || m.source_url?.slice(0, 18) || m.source_type}
            </span>
          ))}
          {data.authored_documents.length > 4 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-canvas-dark text-ink-muted">
              +{data.authored_documents.length - 4}
            </span>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-navy/40 !w-2 !h-2 !border-2 !border-white" />
    </div>
  )
})
