/** Language list cache + helpers (Task 2.4.13).
 *
 * The 57-language course whitelist is now served by the backend at
 * ``GET /api/v1/config/languages`` — UI no longer carries a hardcoded
 * list. ``getLanguages()`` fetches once per app session and caches the
 * result in a module-level singleton; ``getCachedLanguages()`` is the
 * synchronous accessor used by render-paths (``LanguageSelect`` and
 * ``LanguageBadge``). When the cache is cold those components show a
 * placeholder rather than reach out to the network from render.
 *
 * Boot-time prefetch lives in ``App.tsx`` ``ProtectedRoute`` so the
 * cache is typically warm before any modal/badge mounts.
 *
 * Invariant: ``_inflight`` must be reset to ``null`` on BOTH the
 * success and failure paths. Otherwise the singleton stays poisoned
 * with a rejected promise for the rest of the SPA session — a 401
 * from a stale key, a transient 500, or a network blip would make
 * the language list permanently unavailable until a hard page
 * reload. The ``.catch`` clears the slot before re-throwing so the
 * boot-prefetch ``catch`` in ``App.tsx`` still sees the error and
 * a later call (e.g. after re-auth) starts a fresh fetch.
 */

import { configApi } from '../api/config'
import type { LanguageEntry } from '../types/api'

let _cache: LanguageEntry[] | null = null
let _inflight: Promise<LanguageEntry[]> | null = null

export async function getLanguages(): Promise<LanguageEntry[]> {
  if (_cache !== null) return _cache
  if (_inflight !== null) return _inflight
  _inflight = configApi
    .getLanguages()
    .then((r) => {
      _cache = r.items
      _inflight = null
      return r.items
    })
    .catch((err: unknown) => {
      // Reset on failure so a later call retries instead of returning
      // the poisoned promise. Re-throw so the original caller still
      // sees the error (App.tsx logs it).
      _inflight = null
      throw err
    })
  return _inflight
}

export function getCachedLanguages(): LanguageEntry[] | null {
  return _cache
}

export function findLanguage(code: string | null | undefined): LanguageEntry | null {
  if (!code || _cache === null) return null
  return _cache.find((l) => l.code === code) ?? null
}
