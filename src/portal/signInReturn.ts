// Sign-in that brings the student back to the address they were opening: a
// protected page without a session, an expired session (any bearer call
// answered 401), or a return from the payment page. The address travels in
// the sign-in page's own address, as `next` — it survives a full page load
// and keeps nothing in the browser.

const NEXT_PARAM = 'next'

/** The tenant's sign-in page; with `next` (a path and its query), the way back. */
export function loginAddress(tenantId: string, next?: string | null): string {
  const login = `/${tenantId}/login`
  return next ? `${login}?${NEXT_PARAM}=${encodeURIComponent(next)}` : login
}

/** The `next` of a sign-in page's query, or null. */
export function nextOf(search: URLSearchParams): string | null {
  return search.get(NEXT_PARAM)
}

/**
 * Where sign-in leads: `next` when it is a path inside this very tenant's
 * portal — it starts with "/<tenant>/" and holds no "//" (nor a backslash,
 * which a browser reads as one) — else the tenant's home. Another tenant's
 * path, another site, or no `next` at all lead home.
 */
export function afterSignIn(tenantId: string, next: string | null): string {
  if (
    next !== null &&
    next.startsWith(`/${tenantId}/`) &&
    !next.includes('//') &&
    !next.includes('\\')
  ) {
    return next
  }
  return `/${tenantId}/home`
}
