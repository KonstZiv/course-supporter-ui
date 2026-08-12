import { clsx } from 'clsx'
import { Trash2 } from 'lucide-react'
import type { JobListItemResponse } from '../../types/api'
import { JOB_STATE_LABEL, jobStateWordClass } from '../../utils/stateVocabulary'
import { relativeTime } from '../../utils/relativeTime'
import { formatDuration } from '../../utils/formatDuration'
import { workProgressBar } from '../../utils/workProgress'
import { deletedMaterialLabelShort } from '../../utils/materialLabel'
import { ProgressMeter } from './ProgressMeter'

// One work-list row on the detailed floor — reused verbatim by the history-row
// expansion (Д6), so the movement it shows appears there too without a second
// rendering. The two-axis formula (§3): the state WORD carries the work axis
// (motion/mute/alarm-text via jobStateWordClass), never a filled chip.
//
// Progress detail (Д2), one of three, mutually exclusive on the trailing slot:
//   * a live job whose saved progress describes the RUNNING stage → the meter
//     (a bar with a product-language caption; Д5);
//   * any other live (processing) job → the elapsed duration from pickup (Д4);
//     a live job with no start moment is a data anomaly → words alone, no number;
//   * a terminal (or still-queued) row → the relative time, the existing axis.
//
// Deleted source (Р7 / Г3): a muted trash icon plus the short label, no name.
export function ActivityStripRow({
  job,
  now,
}: {
  job: JobListItemResponse
  now: number
}) {
  const bar = workProgressBar(job)
  const duration =
    job.job_state === 'processing' ? formatDuration(job.started_at, now) : null
  const trailing = bar
    ? null
    : job.job_state === 'processing'
      ? duration // may be null (no start moment) → words alone (Д4)
      : relativeTime(job.completed_at ?? job.queued_at, now)

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0 text-sm">
        <span
          className={clsx('shrink-0 font-medium', jobStateWordClass(job.job_state))}
        >
          {JOB_STATE_LABEL[job.job_state]}
        </span>
        <span className="min-w-0 flex-1 flex items-center gap-1 text-ink-light">
          {job.display_deleted ? (
            <>
              <Trash2 size={12} className="shrink-0 text-ink-muted" />
              <span className="truncate text-ink-muted">
                {deletedMaterialLabelShort()}
              </span>
            </>
          ) : (
            job.display_name && <span className="truncate">{job.display_name}</span>
          )}
        </span>
        {trailing && (
          <span className="shrink-0 text-xs text-ink-muted">{trailing}</span>
        )}
      </div>
      {bar && <ProgressMeter {...bar} />}
    </div>
  )
}
