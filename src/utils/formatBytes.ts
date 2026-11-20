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

import type { Language } from '../i18n/languages'
import { localeOf } from '../i18n/languages'
import { translate } from '../i18n/translate'

export function formatBytes(language: Language, bytes: number): string {
  if (bytes < 1024) return translate(language, 'panel.size.bytes', { n: String(bytes) })
  const kb = bytes / 1024
  if (kb < 1024) return translate(language, 'panel.size.kilobytes', { n: round(language, kb) })
  return translate(language, 'panel.size.megabytes', { n: round(language, kb / 1024) })
}

function decimalSeparator(language: Language): string {
  const parts = new Intl.NumberFormat(localeOf(language)).formatToParts(1.5)
  return parts.find((p) => p.type === 'decimal')?.value ?? '.'
}

function round(language: Language, n: number): string {
  return n < 10 ? n.toFixed(1).replace('.', decimalSeparator(language)) : String(Math.round(n))
}
