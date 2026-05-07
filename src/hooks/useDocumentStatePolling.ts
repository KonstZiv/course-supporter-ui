import { useCallback, useMemo } from 'react'
import { usePolling } from './usePolling'
import { nodesApi } from '../api/nodes'
import { useCourseStore } from '../stores/course'
import type { NodeWithDocuments } from '../types/api'

const POLL_INTERVAL_MS = 4000

/** True if any document anywhere in the subtree is in `pending` state. */
export function hasAnyPendingDocument(node: NodeWithDocuments): boolean {
  return (
    node.authored_documents.some((d) => d.state === 'pending') ||
    node.children.some(hasAnyPendingDocument)
  )
}

/**
 * Auto-refresh the course tree while any document is in `pending` state.
 *
 * Polls `nodesApi.getDetail` every 4s; stops once every document settles
 * to a terminal state (`ready` / `error` / `raw` / `integrity_broken`).
 * Pure side effect — relies on the course store as the single source of
 * truth for tree state.
 */
export function useDocumentStatePolling(): void {
  const tree = useCourseStore((s) => s.tree)
  const setTree = useCourseStore((s) => s.setTree)

  const enabled = useMemo(
    () => (tree ? hasAnyPendingDocument(tree) : false),
    [tree],
  )

  const tick = useCallback(async (): Promise<boolean> => {
    if (!tree) return true
    const fresh = await nodesApi.getDetail(tree.id)
    setTree(fresh)
    return !hasAnyPendingDocument(fresh)
  }, [tree, setTree])

  usePolling(tick, POLL_INTERVAL_MS, enabled)
}
