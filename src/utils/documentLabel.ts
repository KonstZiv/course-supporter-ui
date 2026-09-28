import type { AuthoredDocumentSummary } from '../types/api'

/**
 * The name a document is shown by in the course tree: its title first, then
 * its file name, then its link, and the kind as a last resort.
 *
 * A test written in the system has no file, and its link is the service
 * marker every such test shares — so without the title every test would
 * read as that marker (task 07c, PRE-FLIGHT §16).
 */
export function documentLabel(
  document: Pick<
    AuthoredDocumentSummary,
    'title' | 'filename' | 'source_url' | 'source_type'
  >,
): string {
  return (
    document.title ||
    document.filename ||
    document.source_url ||
    document.source_type
  )
}
