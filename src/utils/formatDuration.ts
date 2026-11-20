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

import type { Language } from '../i18n/languages'
import { translate } from '../i18n/translate'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatDuration(language: Language, startedAtIso: string | null, now: number): string | null {
  if (!startedAtIso) return null
  const ms = now - Date.parse(startedAtIso)
  if (!Number.isFinite(ms) || ms < 0) return null
  if (ms < MINUTE) return translate(language, 'panel.duration.lessThanMinute')

  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.floor((ms % HOUR) / MINUTE)

  // The two highest-order units starting from the first non-zero one; a zero
  // second unit is dropped ("2 доби" not "2 доби 0 год"). ms >= MINUTE
  // guarantees at least one non-zero unit.
  const units: { value: number; str: string }[] = [
    { value: days, str: translate(language, 'panel.duration.days', { count: days }) },
    { value: hours, str: translate(language, 'panel.duration.hours', { count: hours }) },
    { value: minutes, str: translate(language, 'panel.duration.minutes', { count: minutes }) },
  ]
  const start = units.findIndex((u) => u.value > 0)
  const first = units[start]
  if (!first) return null // unreachable: ms >= MINUTE guarantees a non-zero unit
  const parts = [first.str]
  const next = units[start + 1]
  if (next && next.value > 0) parts.push(next.str)
  return parts.join(' ')
}
