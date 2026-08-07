import { clsx } from 'clsx'
import { Trash2 } from 'lucide-react'
import type { JobListItemResponse } from '../../types/api'
import { JOB_STATE_LABEL, jobStateWordClass } from '../../utils/stateVocabulary'
import { relativeTime } from '../../utils/relativeTime'

// One work-list row on the detailed floor. The two-axis formula (§3): the state
// WORD carries the work axis (motion/mute/alarm-text via jobStateWordClass),
// never a filled chip. The subject label and time are neutral. Work KIND is not
// named (§2) — the row is word + subject + time.
//
// Deleted source (Р7): a marker without the name. The server scrubs the label
// and flags ``display_deleted``; we show a muted trash icon (a language-free
// marker) and never invent a replacement name.
export function ActivityStripRow({
  job,
  now,
}: {
  job: JobListItemResponse
  now: number
}) {
  const when = relativeTime(job.completed_at ?? job.queued_at, now)
  return (
    <div className="flex items-center gap-2 min-w-0 text-sm">
      <span
        className={clsx('shrink-0 font-medium', jobStateWordClass(job.job_state))}
      >
        {JOB_STATE_LABEL[job.job_state]}
      </span>
      <span className="min-w-0 flex-1 flex items-center gap-1 text-ink-light">
        {job.display_deleted && (
          <Trash2 size={12} className="shrink-0 text-ink-muted" />
        )}
        {job.display_name && (
          <span
            className={clsx('truncate', job.display_deleted && 'text-ink-muted')}
          >
            {job.display_name}
          </span>
        )}
      </span>
      <span className="shrink-0 text-xs text-ink-muted">{when}</span>
    </div>
  )
}
