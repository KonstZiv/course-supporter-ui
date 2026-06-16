import type { NodeWithDocuments } from '../types/api'

/** Depth-first lookup of a node by id within a course tree, or null. */
export function findNode(
  tree: NodeWithDocuments,
  id: string,
): NodeWithDocuments | null {
  if (tree.id === id) return tree
  for (const child of tree.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}
