/**
 * Where the sign-in page sends the author once the key is accepted: back to
 * the address they were opening (ProtectedRoute passes it as `from`), or to
 * the courses. Only a path inside the program is taken — one that starts with
 * "/" but not "//" or "/\", which a browser would read as another site.
 */
export function returnPath(from: unknown): string {
  if (
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !from.startsWith('/\\')
  ) {
    return from
  }
  return '/'
}
