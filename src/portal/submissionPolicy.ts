// Submission policy for the portal's upload form (step Д, DD-SP-V).
//
// What the door accepts — the extension list, the size cap per assignment
// kind, and whether the whole project must arrive as one archive — fetched
// from GET /api/v1/portal/submission-policy instead of being copied into the
// form. The copy that lived there had no lock behind it: before PR #49 it was
// 27 formats short, so a student could not pick a .docx the server accepts,
// and its 10 MiB cap cut off a project archive the server allows at 100 MB.
//
// Cached in a module-level singleton for the same reason as the language list
// beside it: the policy is built from server-side constants, so it cannot go
// stale inside a session and needs no invalidation. Same `_inflight` invariant
// too — cleared on BOTH paths, because a rejected promise left in the slot
// would poison the policy for the rest of the session, and one transient
// failure would leave every form guessing until a page reload.

import { portalApi } from './api/portalClient'
import type {
  PortalAssignmentType,
  SubmissionPolicyEntry,
  SubmissionPolicyResponse,
} from './types'

let _cache: SubmissionPolicyResponse | null = null
let _inflight: Promise<SubmissionPolicyResponse> | null = null

export async function getSubmissionPolicy(): Promise<SubmissionPolicyResponse> {
  if (_cache !== null) return _cache
  if (_inflight !== null) return _inflight
  _inflight = portalApi
    .submissionPolicy()
    .then((r) => {
      _cache = r
      _inflight = null
      return r
    })
    .catch((err: unknown) => {
      _inflight = null
      throw err
    })
  return _inflight
}

/**
 * The entry for one assignment kind, or null when there is none to apply.
 *
 * Null on three distinct occasions that share one answer — the form sends the
 * file and lets the server decide:
 *
 *   * the policy has not loaded (or failed to load);
 *   * `taskType` is null, which the wire allows;
 *   * `taskType` is a kind this build does not know, because the server grew a
 *     fifth one first.
 *
 * The alternative — falling back to the `task` row — would be the "not project
 * → task" rule this whole endpoint exists to delete, and it would be wrong in
 * exactly the case that matters: a project archive silently measured against
 * the 10 MiB cap. Deferring to the server costs one refused upload and tells
 * the truth; guessing costs a legitimate submission the student cannot send.
 */
export function policyFor(
  policy: SubmissionPolicyResponse | null,
  taskType: string | null,
): SubmissionPolicyEntry | null {
  if (policy === null || taskType === null) return null
  const entry = policy.policies[taskType as PortalAssignmentType]
  return entry ?? null
}

// Test seam only: the singleton outlives a test file otherwise, and the second
// test in a file would assert against the first one's policy.
export function resetSubmissionPolicy(): void {
  _cache = null
  _inflight = null
}
