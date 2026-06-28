import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Video,
  Music,
  Image,
  FileText,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import type { PortalMaterialItem, PortalMaterialTreeNode, PortalSourceType } from '../types'
import { SubmissionBadge } from './SubmissionBadge'

const ICON_BY_SOURCE: Record<PortalSourceType, LucideIcon> = {
  video: Video,
  audio: Music,
  presentation: Image,
  text: FileText,
  web: Globe,
}

function iconFor(sourceType: string): LucideIcon {
  // Total over the wire ``str`` — an unexpected source_type falls to FileText.
  return ICON_BY_SOURCE[sourceType as PortalSourceType] ?? FileText
}

function DocumentRow({
  item,
  onSelect,
}: {
  item: PortalMaterialItem
  onSelect: (item: PortalMaterialItem) => void
}) {
  const Icon = iconFor(item.source_type)
  return (
    <button
      onClick={() => onSelect(item)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                 hover:bg-canvas-dark/50 transition-colors"
    >
      <Icon size={16} className="text-ink-muted shrink-0" />
      <span className="flex-1 text-ink truncate">{item.label}</span>
      {item.kind === 'task' && item.overlay && (
        <SubmissionBadge overlay={item.overlay} />
      )}
    </button>
  )
}

function TreeNode({
  node,
  onSelect,
}: {
  node: PortalMaterialTreeNode
  onSelect: (item: PortalMaterialItem) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasContent = node.children.length > 0 || node.documents.length > 0
  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left
                   font-medium text-ink hover:bg-canvas-dark/40 transition-colors"
      >
        {hasContent ? (
          expanded ? (
            <ChevronDown size={16} className="text-ink-muted shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-ink-muted shrink-0" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="truncate">{node.title}</span>
      </button>
      {expanded && (
        <div className="pl-4 border-l border-canvas-dark/40 ml-3">
          {node.documents.map((doc) => (
            <DocumentRow key={doc.id} item={doc} onSelect={onSelect} />
          ))}
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

// Curated course material tree (Phase 6 / T4b, c2). The whole subtree arrives
// in one call (probe B), so expand/collapse is purely client-side — no per-node
// fetch (ratify Q3). Leaf documents are clickable → open the material panel.
export function PortalMaterialTree({
  root,
  onSelect,
}: {
  root: PortalMaterialTreeNode
  onSelect: (item: PortalMaterialItem) => void
}) {
  const empty = root.documents.length === 0 && root.children.length === 0
  if (empty) {
    return <p className="text-ink-muted px-2 py-4">Матеріалів ще немає.</p>
  }
  return (
    <div>
      {root.documents.map((doc) => (
        <DocumentRow key={doc.id} item={doc} onSelect={onSelect} />
      ))}
      {root.children.map((child) => (
        <TreeNode key={child.id} node={child} onSelect={onSelect} />
      ))}
    </div>
  )
}
