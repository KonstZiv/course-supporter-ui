import { useCallback, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { jobsApi } from '../../api/jobs'
import type {
  JobListItemResponse,
  MaterialHistoryItemResponse,
} from '../../types/api'
import { MaterialHistoryRow } from './MaterialHistoryRow'
import { ActivityStripRow } from '../activity/ActivityStripRow'

// The door caps a page at 200 (server GET /jobs, limit le=200). The expansion
// asks for exactly the promised count up to this cap; beyond it, an honest
// overflow line — never a silent partial list (Г6).
const DOOR_LIMIT_CEILING = 200

// Lazy expansion of one material row (§3 c6), following the homework-cost tree's
// pattern: fetch on the FIRST expand, cache in state, retry on failure. The
// collapsed row (MaterialHistoryRow) stays presentational — the state c4 kept out
// lives here. HistoryPage remounts the tbody by offset, so this state resets with
// the page (c6): a cached list never outlives the page it was fetched for.
export function MaterialHistoryRowExpandable({
  item,
  now,
}: {
  item: MaterialHistoryItemResponse
  now: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [jobs, setJobs] = useState<JobListItemResponse[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      // The request size is the PROMISED count (Г6), never a typical page size,
      // capped at the door ceiling — the client bakes no number (c3), so the size
      // is decided right here. Requesting jobs_count > 200 would 422 the door.
      const limit = Math.min(item.jobs_count, DOOR_LIMIT_CEILING)
      const res = await jobsApi.list({ material_id: item.material_id, limit })
      setJobs(res.items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [item.material_id, item.jobs_count])

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    // Fetch on the first expand only; a re-expand reuses the cache (jobs !== null).
    if (next && jobs === null && !loading) void load()
  }

  const overflow = item.jobs_count > DOOR_LIMIT_CEILING

  return (
    <>
      <MaterialHistoryRow
        item={item}
        now={now}
        expanded={expanded}
        onToggle={toggle}
      />
      {expanded && (
        <tr className="bg-canvas/50">
          <td colSpan={4} className="px-4 py-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-1">
                <Loader2 size={14} className="animate-spin" /> Завантаження…
              </div>
            ) : error ? (
              <button
                className="flex items-center gap-2 text-sm text-coral"
                onClick={() => void load()}
              >
                <AlertCircle size={14} /> Помилка завантаження — повторити
              </button>
            ) : (
              <>
                <ul className="space-y-0.5">
                  {(jobs ?? []).map((job) => (
                    <li
                      key={job.id}
                      data-testid="work-row"
                      className="px-2 py-1.5 rounded-lg"
                    >
                      <ActivityStripRow job={job} now={now} />
                    </li>
                  ))}
                </ul>
                {overflow && (
                  <p className="text-xs text-ink-muted mt-1">
                    Показано перші {DOOR_LIMIT_CEILING} з {item.jobs_count}.
                  </p>
                )}
              </>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
