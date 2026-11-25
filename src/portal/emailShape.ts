// Minimal mirror of the backend email shape (RP6: "@" + non-empty local +
// non-empty domain, max 320) — no strict RFC.
export function isEmailShaped(value: string): boolean {
  if (value.length === 0 || value.length > 320) return false
  const at = value.indexOf('@')
  if (at <= 0) return false
  if (value.indexOf('@', at + 1) !== -1) return false
  return value.length - at - 1 > 0
}
