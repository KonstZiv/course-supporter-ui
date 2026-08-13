// Д4 — elapsed work time from the moment the worker PICKED UP the job
// (started_at), not the queue time: before pickup the phase is "у черзі", a
// different duration, and mixing them would read "обробляється 40 хв" for work
// that queued 39 of them. Two largest units, no seconds: "менше хвилини",
// "7 хв", "3 год 20 хв", "2 доби 5 год". Seconds would tick faster than data
// arrives; the form must survive tens of hours (canon already measures a long
// video). ``now`` is injected — updated by the poll cycle, never a separate
// browser counter (that would be a second clock, ARC.md §8 Д4).
//
// started_at is null for work terminated straight from the queue; for a LIVE
// job a null start is a data anomaly — the caller then shows words without a
// number, so this returns null and never invents a substitute.

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// "доба" plural (a 24-h span, deliberately not the calendar-day word Intl gives):
// 1 доба, 2–4 доби, 5+ діб, with the 11–14 exception.
function dobaWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'доба'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'доби'
  return 'діб'
}

export function formatDuration(startedAtIso: string | null, now: number): string | null {
  if (!startedAtIso) return null
  const ms = now - Date.parse(startedAtIso)
  if (!Number.isFinite(ms) || ms < 0) return null
  if (ms < MINUTE) return 'менше хвилини'

  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.floor((ms % HOUR) / MINUTE)

  // The two highest-order units starting from the first non-zero one; a zero
  // second unit is dropped ("2 доби" not "2 доби 0 год"). ms >= MINUTE
  // guarantees at least one non-zero unit.
  const units: { value: number; word: string }[] = [
    { value: days, word: dobaWord(days) },
    { value: hours, word: 'год' },
    { value: minutes, word: 'хв' },
  ]
  const start = units.findIndex((u) => u.value > 0)
  const first = units[start]
  if (!first) return null // unreachable: ms >= MINUTE guarantees a non-zero unit
  const parts = [`${first.value} ${first.word}`]
  const next = units[start + 1]
  if (next && next.value > 0) parts.push(`${next.value} ${next.word}`)
  return parts.join(' ')
}
