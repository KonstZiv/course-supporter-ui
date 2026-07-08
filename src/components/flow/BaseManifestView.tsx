import { Folder, FileText } from 'lucide-react'
import type {
  ProjectBaseManifest,
  ManifestEntry,
  EntryClass,
  ExcludedReason,
} from '../../types/api'

// Lean read-only manifest view (KD18 P6): included tree + collapsed excluded +
// totals. NOT a full diff viewer (DD-6-Q, out of scope).

function formatBytes(n: number): string {
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
  return `${(n / (1024 * 1024)).toFixed(1)} МБ`
}

const CLS_LABEL: Record<EntryClass, string> = {
  text: 'текст',
  document: 'документ',
  binary: 'бінарний',
}

const REASON_LABEL: Record<ExcludedReason, string> = {
  denylist_dir: 'denylist-директорія',
  magic_mismatch: 'невідповідність типу',
  nested_archive: 'вкладений архів',
}

interface DirNode {
  name: string
  dirs: Map<string, DirNode>
  files: { name: string; entry: ManifestEntry }[]
}

function buildTree(entries: ManifestEntry[]): DirNode {
  const root: DirNode = { name: '', dirs: new Map(), files: [] }
  for (const entry of entries) {
    const parts = entry.path.split('/')
    const fileName = parts.pop() ?? entry.path
    let node = root
    for (const part of parts) {
      let child = node.dirs.get(part)
      if (!child) {
        child = { name: part, dirs: new Map(), files: [] }
        node.dirs.set(part, child)
      }
      node = child
    }
    node.files.push({ name: fileName, entry })
  }
  return root
}

function TreeNode({ node, depth }: { node: DirNode; depth: number }) {
  const dirs = [...node.dirs.values()].sort((a, b) => a.name.localeCompare(b.name))
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <ul className="space-y-0.5">
      {dirs.map((d) => (
        <li key={`d:${d.name}`}>
          <div
            className="flex items-center gap-1.5 text-ink font-medium"
            style={{ paddingLeft: depth * 14 }}
          >
            <Folder size={13} className="text-amber shrink-0" />
            <span className="truncate">{d.name}/</span>
          </div>
          <TreeNode node={d} depth={depth + 1} />
        </li>
      ))}
      {files.map((f) => (
        <li
          key={`f:${f.name}`}
          className="flex items-center gap-1.5 text-ink-muted"
          style={{ paddingLeft: depth * 14 + 14 }}
        >
          <FileText size={13} className="shrink-0" />
          <span className="truncate text-ink">{f.name}</span>
          <span className="text-[10px] px-1 rounded bg-navy/6 shrink-0">
            {CLS_LABEL[f.entry.cls]}
          </span>
          <span className="text-[10px] shrink-0">{formatBytes(f.entry.size)}</span>
        </li>
      ))}
    </ul>
  )
}

export function BaseManifestView({ manifest }: { manifest: ProjectBaseManifest }) {
  const tree = buildTree(manifest.included)
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-3 flex-wrap text-xs text-ink-muted">
        <span>
          <strong className="text-ink">{manifest.total_files}</strong> файлів
        </span>
        <span>
          <strong className="text-ink">{formatBytes(manifest.total_bytes)}</strong>
        </span>
        <span className="font-mono truncate" title={manifest.aggregate_hash}>
          hash {manifest.aggregate_hash.slice(0, 12)}…
        </span>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
          Включено ({manifest.included.length})
        </h3>
        {manifest.included.length === 0 ? (
          <p className="text-xs text-ink-muted">Немає включених файлів.</p>
        ) : (
          <TreeNode node={tree} depth={0} />
        )}
      </div>

      {manifest.excluded.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
            Виключено ({manifest.excluded.length})
          </h3>
          <ul className="space-y-0.5">
            {manifest.excluded.map((e) => (
              <li
                key={e.path}
                className="flex items-center gap-1.5 text-ink-muted text-xs"
              >
                <span className="truncate text-ink">{e.path}</span>
                <span className="text-[10px] px-1 rounded bg-coral-pale text-coral shrink-0">
                  {REASON_LABEL[e.reason]}
                </span>
                <span className="text-[10px] shrink-0">
                  {e.entries} · {formatBytes(e.size)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
