import { create } from 'zustand'
import { billingOutlook } from '../api/billing'
import type { BillingOutlookResponse } from '../types/api'

// The author's reminders and the students' reviews waiting for units
// (`GET /billing/outlook`), one answer for the whole page: the banner under
// the header and the reminders on "Мої курси" and "Юніти" read the same one.
// In memory only, for as long as the tab lives — nothing is kept in the
// browser. The shell (`useOutlookReader` in AppLayout) is what asks.

interface OutlookState {
  /** The last answer; null before the first one or after leaving. */
  outlook: BillingOutlookResponse | null
  /** Ask again; a failed answer keeps the last one. */
  refresh: () => Promise<void>
  reset: () => void
}

// Only the answer to the latest question is kept: an older one that comes
// back late would show what no longer holds.
let asked = 0

export const useOutlookStore = create<OutlookState>((set) => ({
  outlook: null,
  refresh: async () => {
    const mine = ++asked
    try {
      const found = await billingOutlook()
      if (mine === asked) set({ outlook: found })
    } catch {
      // The reminders are a courtesy: no answer, no new line.
    }
  },
  reset: () => {
    asked += 1
    set({ outlook: null })
  },
}))
