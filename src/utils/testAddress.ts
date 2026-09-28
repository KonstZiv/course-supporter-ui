// The test editor's two addresses (routes in App.tsx), built in one place for
// the course tree, its node menu and the editor itself.

/** A test there is. */
export function testEditorPath(documentId: string): string {
  return `/test/${documentId}/edit`
}

/**
 * A new test in a node. The course is named too: the editor letters the
 * options in its language before the first save. Without it the editor says
 * it cannot tell where the test belongs.
 */
export function newTestPath(nodeId: string, courseId: string | null): string {
  const query = new URLSearchParams({ node: nodeId })
  if (courseId !== null) query.set('course', courseId)
  return `/test/new?${query}`
}
