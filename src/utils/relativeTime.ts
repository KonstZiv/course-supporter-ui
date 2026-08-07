// Compact Ukrainian relative time for strip rows — the only thing that
// distinguishes two same-subject jobs is when they ran (§2). ``Intl`` supplies
// the correct Ukrainian plural forms ("1 хвилину" / "2 хвилини" / "5 хвилин"),
// so no hand-rolled pluralisation lives here. ``now`` is injected for testability.

const RTF = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function relativeTime(iso: string, now: number): string {
  const diff = now - Date.parse(iso)
  if (diff < MINUTE) return 'щойно'
  if (diff < HOUR) return RTF.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return RTF.format(-Math.floor(diff / HOUR), 'hour')
  return RTF.format(-Math.floor(diff / DAY), 'day')
}
