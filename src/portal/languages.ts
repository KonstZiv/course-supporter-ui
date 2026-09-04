// Language whitelist for the portal's review-language field (step Г2 §2.1).
//
// Fetched once per SPA session and kept in a module-level singleton. The list
// is a build-time constant on the server (config/languages.yaml behind
// GET /api/v1/portal/languages), so it cannot go stale inside a session and
// needs no invalidation — which is exactly why this one is cached and the
// student's own `preferred_language` is not (that changes on every submission
// that names a language, and is re-read where it is used).
//
// A sibling of the author app's `src/utils/languages.ts`, not a reuse: that
// one fetches through `api/client.ts`, which is hard-bound to the X-API-Key
// header, and a portal session carries a bearer token and no key. Same reason
// the two clients are siblings rather than one.
//
// Invariant carried over from the author singleton: `_inflight` must be
// cleared on BOTH paths. Leaving a rejected promise in the slot would poison
// the list for the rest of the session — one transient failure and the field
// never fills again short of a page reload.

import { portalApi } from './api/portalClient'
import type { PortalLanguageEntry } from './types'

let _cache: PortalLanguageEntry[] | null = null
let _inflight: Promise<PortalLanguageEntry[]> | null = null

export async function getPortalLanguages(): Promise<PortalLanguageEntry[]> {
  if (_cache !== null) return _cache
  if (_inflight !== null) return _inflight
  _inflight = portalApi
    .languages()
    .then((r) => {
      _cache = r.items
      _inflight = null
      return r.items
    })
    .catch((err: unknown) => {
      _inflight = null
      throw err
    })
  return _inflight
}

// Test seam only: the singleton outlives a test file otherwise, and the second
// test in a file would assert against the first one's list.
export function resetPortalLanguages(): void {
  _cache = null
  _inflight = null
}
