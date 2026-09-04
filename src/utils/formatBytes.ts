/**
 * A single file size as the author reads it: "40 Б", "1,4 КБ", "4,0 МБ".
 *
 * Shown because "not read" invites "how much did I lose" — a 40-byte
 * `.gitignore` and a 4 MB dataset are very different answers, and the existing
 * upload caption (``formatUploadCaption``) cannot tell them apart: it speaks
 * only in megabytes and would call both "менше 1 МБ".
 *
 * A twin of the portal's ``formatFileSize`` rather than a shared helper. The
 * two bundles import nothing from each other today — the same boundary that
 * keeps the portal off the author's API client — and one formatting function
 * is not the reason to open it. If a third caller appears, that is the moment
 * to reconsider.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  const kb = bytes / 1024
  if (kb < 1024) return `${round(kb)} КБ`
  return `${round(kb / 1024)} МБ`
}

// The decimal comma Ukrainian uses; one decimal below ten, whole numbers above
// — past ten the fraction is noise.
function round(n: number): string {
  return (n < 10 ? n.toFixed(1) : String(Math.round(n))).replace('.', ',')
}
