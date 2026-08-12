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
  setItems: (items: JobListItemResponse[]) => void
  reset: () => void
}

export const useWorkListStore = create<WorkListState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  reset: () => set({ items: [] }),
}))
