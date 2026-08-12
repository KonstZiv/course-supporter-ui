import type { JobListItemResponse } from '../../types/api'
import { formatDuration } from '../../utils/formatDuration'
import { workProgressBar } from '../../utils/workProgress'
import { ProgressMeter } from '../activity/ProgressMeter'

// Д1 — the material card's progress detail, taken from the shared work-list
// store (no own poll, no own request): the live job of THIS material
// contributes the very movement or duration the strip shows, from one source
// (Р2). The same rule as the strip row (Д2): a current-stage bar, else the
// elapsed duration from pickup, else nothing. Nothing is also what shows when
// the store holds no live job for the material — the card then falls back to
// its phase badge alone, the accepted cost of Д1.
export function MaterialProgressDetail({
  job,
  now,
}: {
  job: JobListItemResponse | undefined
  now: number
}) {
  if (!job) return null
  const bar = workProgressBar(job)
  if (bar) return <ProgressMeter {...bar} />
  if (job.job_state === 'processing') {
    const duration = formatDuration(job.started_at, now)
    if (duration) return <p className="text-xs text-ink-muted mt-1">{duration}</p>
  }
  return null
}
