import type { ReconciliationIssue, ReconciliationIssueType } from '../../types/api'

const TYPE_BADGE: Record<ReconciliationIssueType, { bg: string; text: string; label: string }> = {
  contradiction: { bg: 'bg-red-100', text: 'text-red-700', label: 'суперечн.' },
  gap: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'прогалин' },
  overlap: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'перетин.' },
  inconsistency: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'неузгодж.' },
}

interface Props {
  issues: ReconciliationIssue[]
  acceptedCount: number
}

export function ReconciliationSummary({ issues, acceptedCount }: Props) {
  const counts = issues.reduce<Partial<Record<ReconciliationIssueType, number>>>((acc, i) => {
    acc[i.issue_type] = (acc[i.issue_type] || 0) + 1
    return acc
  }, {})

  const entries = (Object.entries(counts) as [ReconciliationIssueType, number][])
    .filter(([, n]) => n > 0)

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {entries.map(([type, count]) => {
          const b = TYPE_BADGE[type]
          return (
            <span
              key={type}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.bg} ${b.text}`}
            >
              {count} {b.label}
            </span>
          )
        })}
      </div>
      <span className="text-xs text-ink-muted">
        Обрано: {acceptedCount} з {issues.length}
      </span>
    </div>
  )
}
