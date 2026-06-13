import { useCallback, useEffect, useRef, useState } from 'react'
import { usePolling } from './usePolling'
import { jobsApi } from '../api/jobs'
import type { JobResponse, JobStatus } from '../types/api'

// KD-B (Task 3.2.5a): generation is long (~394s full run, live-smoke 3.2.4),
// and ``stage_progress`` advances per-node-commit (discretely), so the 4s
// document-state cadence is needless here. 5s gives perceptible
// queued→active→complete transitions at ~79 requests per full run.
const POLL_INTERVAL_MS = 5000

// Terminal stop set — the run is observed via ``status``. ``cancelled`` is
// terminal by the backend state machine (no outgoing transition), even
// though this slice surfaces no cancel affordance, so a summary job is
// never ``cancelled`` today. It is kept in the set as a guard against a
// latent infinite-poll if a cancel affordance is introduced later (3.2.5b+)
// — and it aligns the polling axis with the panel, which already treats
// ``cancelled`` as terminal for dismiss (Task 3.2.5a, KD-C: stop set widened
// to full backend terminality).
const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>([
  'complete',
  'failed',
  'cancelled',
])

/**
 * Poll ``GET /jobs/{job_id}`` while a node-summary run is in flight.
 *
 * Producer (the generate trigger, c4) supplies ``jobId`` + the full
 * ``JobResponse`` from the 202 response so the render starts from real
 * data, not a blind poll. Built on the generic ``usePolling`` primitive
 * (unmodified — Інваріант 2): ticks every 5s, stops once ``status``
 * reaches a terminal value. Continue-on-error is inherited from
 * ``usePolling`` by design (no max-attempts cap for this slice).
 *
 * Returns the latest ``JobResponse`` (or null when no run is active).
 * State is local to the consuming subtree — never Zustand (Інваріант 1).
 */
export function useJobPolling(
  jobId: string | null,
  initialJob: JobResponse | null,
): JobResponse | null {
  const [job, setJob] = useState<JobResponse | null>(initialJob)

  // Re-seed from the fresh 202 payload whenever a new run starts. Read
  // ``initialJob`` via ref so the reset effect keys on ``jobId`` only
  // (mirrors the ``fnRef`` pattern in ``usePolling`` — avoids re-running
  // on every new ``initialJob`` object identity).
  const initialRef = useRef(initialJob)
  initialRef.current = initialJob
  useEffect(() => {
    setJob(initialRef.current)
  }, [jobId])

  const enabled =
    jobId !== null && (job === null || !TERMINAL_STATUSES.has(job.status))

  const tick = useCallback(async (): Promise<boolean> => {
    if (!jobId) return true
    const fresh = await jobsApi.get(jobId)
    setJob(fresh)
    return TERMINAL_STATUSES.has(fresh.status)
  }, [jobId])

  usePolling(tick, POLL_INTERVAL_MS, enabled)

  return job
}
