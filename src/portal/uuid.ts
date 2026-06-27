// The portal tenant lives in the URL as a UUID segment (ratify Q3:
// ``/<tenant-id>/...``, slug URLs out of scope). A non-UUID segment is an
// invalid portal link — surfaced as an error, never used to fetch.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | undefined): value is string {
  return value !== undefined && UUID_RE.test(value)
}
