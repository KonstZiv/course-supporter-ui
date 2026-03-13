import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReconciliationIssue, ReconciliationIssueType } from '../../types/api'

const TYPE_STYLES: Record<ReconciliationIssueType, { bg: string; text: string; label: string }> = {
  contradiction: { bg: 'bg-red-100', text: 'text-red-700', label: 'Суперечність' },
  gap: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Прогалина' },
  overlap: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Перетин' },
  inconsistency: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Неузгодженість' },
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

interface Props {
  issue: ReconciliationIssue
  accepted: boolean
  onToggle: () => void
}

export function IssueCard({ issue, accepted, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false)
  const style = TYPE_STYLES[issue.issue_type]

  return (
    <div
      className={`rounded-xl border transition-colors ${
        accepted ? 'border-navy/30 bg-white' : 'border-canvas-dark/40 bg-canvas-dark/20 opacity-70'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox"
          checked={accepted}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-canvas-dark accent-navy cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            <span className="text-xs text-ink-muted truncate">{issue.node_title}</span>
            <span className="text-xs text-ink-muted/60">·</span>
            <code className="text-xs text-navy bg-navy-pale px-1.5 py-0.5 rounded">
              {issue.field}
            </code>
          </div>
          <p className="text-sm text-ink mt-1.5">{issue.description}</p>
        </div>
      </div>

      {/* Diff block */}
      <div className="mx-3 mb-2 rounded-lg border border-canvas-dark/30 overflow-hidden text-xs font-mono">
        <div className="bg-red-50 px-3 py-2 border-b border-canvas-dark/20">
          <span className="text-red-400 select-none mr-2">−</span>
          <span className="text-red-700 whitespace-pre-wrap break-words">
            {formatValue(issue.current_value)}
          </span>
        </div>
        <div className="bg-green-50 px-3 py-2">
          <span className="text-green-400 select-none mr-2">+</span>
          <span className="text-green-700 whitespace-pre-wrap break-words">
            {formatValue(issue.suggested_value)}
          </span>
        </div>
      </div>

      {/* Reasoning (collapsible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-3 pb-2 text-xs text-ink-muted hover:text-ink transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Обгрунтування
      </button>
      {expanded && (
        <p className="px-3 pb-3 text-xs text-ink-muted leading-relaxed">
          {issue.reasoning}
        </p>
      )}
    </div>
  )
}
