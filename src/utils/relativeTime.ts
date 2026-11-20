import type { Language } from '../i18n/languages'
import { localeOf } from '../i18n/languages'
import { translate } from '../i18n/translate'

// Compact Ukrainian relative time for strip rows — the only thing that
// distinguishes two same-subject jobs is when they ran (§2). ``Intl`` supplies
// the correct Ukrainian plural forms ("1 хвилину" / "2 хвилини" / "5 хвилин"),
// so no hand-rolled pluralisation lives here. ``now`` is injected for testability.

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function relativeTime(language: Language, iso: string, now: number): string {
  const diff = now - Date.parse(iso)
  if (diff < MINUTE) return translate(language, 'panel.relativeTime.justNow')
  const rtf = new Intl.RelativeTimeFormat(localeOf(language), { numeric: 'auto' })
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour')
  return rtf.format(-Math.floor(diff / DAY), 'day')
}
