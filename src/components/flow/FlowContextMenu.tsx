import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { nodesApi } from '../../api/nodes'
import { generationApi } from '../../api/generation'
import { useCourseStore } from '../../stores/course'
import { Modal } from '../ui/Modal'
import { EditableNodeModal } from '../structure/EditableNodeModal'

export interface MenuPosition {
  x: number
  y: number
  nodeId: string
  nodeTitle: string
  isRoot: boolean
}

interface Props {
  position: MenuPosition
  onClose: () => void
}

export function FlowContextMenu({ position, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [showRename, setShowRename] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renameTitle, setRenameTitle] = useState(position.nodeTitle)
  const [busy, setBusy] = useState(false)
  const refreshTree = useRefreshTree()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showAdd || showRename || showEditable) return
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, showAdd, showRename, showEditable])

  const addChild = useCallback(async () => {
    if (!newTitle.trim()) return
    setBusy(true)
    try {
      await nodesApi.createChild(position.nodeId, newTitle.trim())
      await refreshTree()
      setShowAdd(false)
      onClose()
    } finally {
      setBusy(false)
    }
  }, [newTitle, position.nodeId, refreshTree, onClose])

  const rename = useCallback(async () => {
    if (!renameTitle.trim()) return
    setBusy(true)
    try {
      await nodesApi.update(position.nodeId, { title: renameTitle.trim() })
      await refreshTree()
      setShowRename(false)
      onClose()
    } finally {
      setBusy(false)
    }
  }, [renameTitle, position.nodeId, refreshTree, onClose])

  const deleteNode = useCallback(async () => {
    if (!confirm(`Видалити «${position.nodeTitle}» та все вкладене?`)) return
    setBusy(true)
    try {
      await nodesApi.delete(position.nodeId)
      await refreshTree()
      onClose()
    } finally {
      setBusy(false)
    }
  }, [position, refreshTree, onClose])

  const generate = useCallback(async () => {
    setBusy(true)
    try {
      await generationApi.generate(position.nodeId, 'free')
      onClose()
    } finally {
      setBusy(false)
    }
  }, [position.nodeId, onClose])

  const triggerUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.pptx,.mp4,.mp3,.txt,.html,.docx'
    input.onchange = async () => {
      if (!input.files) return
      setBusy(true)
      const { materialsApi } = await import('../../api/materials')
      for (const file of Array.from(input.files)) {
        const type = guessSourceType(file.name)
        await materialsApi.upload(position.nodeId, file, type)
      }
      await refreshTree()
      setBusy(false)
      onClose()
    }
    input.click()
  }, [position.nodeId, refreshTree, onClose])

  const items = [
    { icon: FolderPlus, label: 'Додати підрозділ', action: () => setShowAdd(true) },
    { icon: Upload, label: 'Завантажити матеріал', action: triggerUpload },
    { icon: Pencil, label: 'Перейменувати', action: () => setShowRename(true) },
    { icon: Sparkles, label: 'Згенерувати структуру', action: generate, accent: true },
    { icon: BookOpen, label: 'Опис вузла', action: () => setShowEditable(true), accent: true },
    ...(position.isRoot
      ? []
      : [{ icon: Trash2, label: 'Видалити', action: deleteNode, danger: true }]),
  ]

  return (
    <>
      <motion.div
        ref={ref}
        className="fixed z-50 bg-white rounded-xl shadow-card-lg border border-canvas-dark/40
                   py-1.5 min-w-[220px] overflow-hidden"
        style={{ left: position.x, top: position.y }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
      >
        <div className="px-3 py-1.5 border-b border-canvas-dark/30 mb-1">
          <span className="text-xs text-ink-muted font-medium truncate block">
            {position.nodeTitle}
          </span>
        </div>
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            disabled={busy}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
              ${(item as {danger?: boolean}).danger
                ? 'text-coral hover:bg-coral-pale'
                : (item as {accent?: boolean}).accent
                  ? 'text-navy font-medium hover:bg-navy-pale'
                  : 'text-ink hover:bg-canvas-dark'}
              disabled:opacity-50
            `}
          >
            <item.icon size={15} />
            {item.label}
          </button>
        ))}
      </motion.div>

      {/* Add child modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Новий підрозділ">
        <input
          className="input mb-4"
          placeholder="Назва розділу"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addChild()}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setShowAdd(false)}>
            Скасувати
          </button>
          <button className="btn-primary btn-sm" onClick={addChild} disabled={busy || !newTitle.trim()}>
            Створити
          </button>
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal open={showRename} onClose={() => setShowRename(false)} title="Перейменувати">
        <input
          className="input mb-4"
          value={renameTitle}
          onChange={(e) => setRenameTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && rename()}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setShowRename(false)}>
            Скасувати
          </button>
          <button className="btn-primary btn-sm" onClick={rename} disabled={busy || !renameTitle.trim()}>
            Зберегти
          </button>
        </div>
      </Modal>

      {/* Editable structure modal */}
      <EditableNodeModal
        nodeId={position.nodeId}
        nodeTitle={position.nodeTitle}
        open={showEditable}
        onClose={() => setShowEditable(false)}
      />
    </>
  )
}

function guessSourceType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp4', 'mp3', 'wav', 'webm', 'ogg'].includes(ext || '')) return 'video'
  if (['pdf', 'pptx', 'ppt'].includes(ext || '')) return 'presentation'
  if (['html', 'htm'].includes(ext || '')) return 'web'
  return 'text'
}

/** Hook: reload tree for the current root course node. */
function useRefreshTree() {
  const tree = useCourseStore((s) => s.tree)
  const setTree = useCourseStore((s) => s.setTree)
  return useCallback(async () => {
    if (!tree) return
    const { nodesApi } = await import('../../api/nodes')
    const fresh = await nodesApi.getDetail(tree.id)
    setTree(fresh)
  }, [tree, setTree])
}
