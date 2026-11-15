// The month of a spending report (`GET /billing/spending?from&to`): its
// bounds as inclusive UTC days, its name, the step to the next or previous
// one. Pure — the clock is the caller's.

export interface Month {
  year: number
  /** 0-based, as `Date` counts months. */
  month: number
}

const MONTH_NAME = new Intl.DateTimeFormat('uk-UA', {
  month: 'long',
  timeZone: 'UTC',
})

const pad = (n: number) => String(n).padStart(2, '0')

/** The month `now` falls in, in UTC. */
export function monthOf(now: Date): Month {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() }
}

/** The month `by` months from `m` (negative — back). */
export function shiftMonth(m: Month, by: number): Month {
  const at = new Date(Date.UTC(m.year, m.month + by, 1))
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() }
}

/** Whether `a` is after `b`. */
export function isAfter(a: Month, b: Month): boolean {
  return a.year > b.year || (a.year === b.year && a.month > b.month)
}

/** The first and the last day of the month, YYYY-MM-DD (both included). */
export function monthBounds(m: Month): { from: string; to: string } {
  const last = new Date(Date.UTC(m.year, m.month + 1, 0)).getUTCDate()
  const head = `${m.year}-${pad(m.month + 1)}`
  return { from: `${head}-01`, to: `${head}-${pad(last)}` }
}

/** "листопад 2026". */
export function monthLabel(m: Month): string {
  return `${MONTH_NAME.format(new Date(Date.UTC(m.year, m.month, 1)))} ${m.year}`
}
