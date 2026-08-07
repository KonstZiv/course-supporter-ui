import { useCallback, useMemo } from 'react'
import { usePolling } from './usePolling'
import { nodesApi } from '../api/nodes'
import { useCourseStore } from '../stores/course'
import type { NodeWithDocuments } from '../types/api'

const POLL_INTERVAL_MS = 4000

/**
 * True if any document anywhere in the subtree is still in flight — its
 * processing phase is `queued` or `processing`.
 *
 * Equivalent to the pre-B `state === 'pending'` test (an in-flight job is
 * exactly what the coarse axis collapsed to `pending`), now read on the
 * canonical phase axis. `awaiting_author`, `ready` and `error` are all at rest
 * and do NOT keep the poll alive — in particular the poll stops at
 * `awaiting_author`, where the system waits on the author, not on itself
 * (PROBE-B q3; TASK-B §3 Б3).
 */
export function hasAnyInFlightDocument(node: NodeWithDocuments): boolean {
  return (
    node.authored_documents.some(
      (d) => d.processing_phase === 'queued' || d.processing_phase === 'processing',
    ) || node.children.some(hasAnyInFlightDocument)
  )
}

/**
 * Auto-refresh the course tree while any document is in flight.
 *
 * Polls `nodesApi.getDetail` every 4s; stops once every document settles off
 * the in-flight phases — i.e. reaches `awaiting_author`, `ready` or `error`.
 * Pure side effect — relies on the course store as the single source of truth
 * for tree state.
 */
export function useDocumentStatePolling(): void {
  const tree = useCourseStore((s) => s.tree)
  const setTree = useCourseStore((s) => s.setTree)

  const enabled = useMemo(
    () => (tree ? hasAnyInFlightDocument(tree) : false),
    [tree],
  )

  const tick = useCallback(async (): Promise<boolean> => {
    if (!tree) return true
    const fresh = await nodesApi.getDetail(tree.id)
    setTree(fresh)
    return !hasAnyInFlightDocument(fresh)
  }, [tree, setTree])

  usePolling(tick, POLL_INTERVAL_MS, enabled)
}
