import { create } from 'zustand'
import type { JobListItemResponse } from '../types/api'

// Shared in-memory store for the author work-list (step Д, decision Д8). Lives
// as long as the tab, like the course store — the same means, no disk, no DB.
// The ONE shell-mounted poll (``useActivityStrip``) is its only writer; every
// progress surface reads from here directly — the strip floors, the material
// card (Д1), the run-state card (В2 fold). No second source of truth, no event
// bus, no tree wrapper: readers subscribe straight to ``items`` (Д8).
interface WorkListState {
  items: JobListItemResponse[]
  // Д10 — a wake signal. A trigger that starts work (a just-fired run) bumps
  // this; the shell poll watches it and reads NOW, off-schedule, instead of
  // waiting out the idle cadence. It carries no content: the loop stays the
  // ONLY writer of ``items`` (Д8 kept literally). No store seed from the
  // trigger's own response — that would predict the loop's content and risk
  // two truths about one job (Р2), so the loop's own read is the one truth.
  refreshNonce: number
  setItems: (items: JobListItemResponse[]) => void
  requestRefresh: () => void
  reset: () => void
}

export const useWorkListStore = create<WorkListState>((set) => ({
  items: [],
  refreshNonce: 0,
  setItems: (items) => set({ items }),
  requestRefresh: () => set((s) => ({ refreshNonce: s.refreshNonce + 1 })),
  reset: () => set({ items: [], refreshNonce: 0 }),
}))
