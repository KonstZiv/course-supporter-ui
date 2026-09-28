import { api } from './client'
import type {
  TestRefusal,
  TestRefusalPlace,
  WrittenTestBody,
  WrittenTestCheck,
  WrittenTestIncompletePlace,
  WrittenTestPublicationResponse,
  WrittenTestResponse,
} from '../types/api'

// A test written in the system — the author's routes of tasks 07b and 07c
// (backend ``api/routes/test_objects.py``). Hiding a test is the document
// route's ``DELETE /documents/{id}``, not one of these.
export const testsApi = {
  // POST /api/v1/nodes/{node_id}/tests → 201 with the test; nothing is
  // published. Without a title the route refuses, hence the required one.
  create: (nodeId: string, body: WrittenTestBody & { title: string }) =>
    api.post<WrittenTestResponse>(`/api/v1/nodes/${nodeId}/tests`, body),

  // GET .../draft → the draft, the version in force and the check; reading
  // asks for nothing.
  get: (documentId: string) =>
    api.get<WrittenTestResponse>(`/api/v1/tests/${documentId}/draft`),

  // PUT .../draft → the draft replaced whole, saved even when unfinished.
  replace: (documentId: string, body: WrittenTestBody) =>
    api.put<WrittenTestResponse>(`/api/v1/tests/${documentId}/draft`, body),

  // The same PUT from a YAML file, sent as its bytes so a refusal names the
  // file's line and column. The type is set, not taken from the file: a
  // browser types a .yaml file as it likes, often not at all, and the route
  // takes only application/yaml or text/yaml.
  replaceWithYaml: (documentId: string, file: Blob) =>
    api.putText<WrittenTestResponse>(
      `/api/v1/tests/${documentId}/draft`,
      file,
      'application/yaml',
    ),

  // POST .../check → in_progress, or ready for a draft checked before and
  // unchanged since. Publishes nothing.
  check: (documentId: string) =>
    api.post<WrittenTestCheck>(`/api/v1/tests/${documentId}/check`),

  // POST .../publish → 201 with a new version, 200 with the same one.
  publish: (documentId: string) =>
    api.post<WrittenTestPublicationResponse>(
      `/api/v1/tests/${documentId}/publish`,
    ),

  // GET .../yaml → the saved draft as YAML, its title included — text, not
  // JSON.
  exportYaml: (documentId: string) =>
    api.getText(`/api/v1/tests/${documentId}/yaml`),
}

/**
 * Read the coded refusal of a test route from an ``ApiError.body``.
 *
 * FastAPI wraps it under a top-level ``detail`` key and ``client.ts`` keeps the
 * body verbatim, so the envelope is unwrapped here, as ``uncoveredStaleDetail``
 * does. Null for any other body — a 404's ``detail`` string, a validation
 * array, no body — so the caller falls back to its own words.
 */
export function testRefusal(body: unknown): TestRefusal | null {
  const detail = objectOrNull(objectOrNull(body)?.detail)
  if (!detail) return null
  const { code, details, place, incomplete, category } = detail
  if (typeof code !== 'string' || typeof details !== 'string') return null
  return {
    code,
    details,
    place: objectOrNull(place) ? (place as TestRefusalPlace) : null,
    incomplete: Array.isArray(incomplete)
      ? (incomplete as WrittenTestIncompletePlace[])
      : null,
    category: typeof category === 'string' ? category : null,
  }
}

function objectOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}
