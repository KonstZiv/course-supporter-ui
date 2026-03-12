import { create } from 'zustand'
import type { NodeWithMaterials } from '../types/api'

interface CourseState {
  tree: NodeWithMaterials | null
  selectedNodeId: string | null
  loading: boolean
  error: string | null
  setTree: (tree: NodeWithMaterials) => void
  setSelectedNodeId: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useCourseStore = create<CourseState>((set) => ({
  tree: null,
  selectedNodeId: null,
  loading: false,
  error: null,
  setTree: (tree) => set({ tree, error: null }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  reset: () => set({ tree: null, selectedNodeId: null, loading: false, error: null }),
}))
