import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
  Sparkles,
  BookOpen,
  Scale,
  GraduationCap,
  Zap,
  Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { nodesApi } from '../../api/nodes'
import { generationApi } from '../../api/generation'
import { useCourseStore } from '../../stores/course'
import { Modal } from '../ui/Modal'
import { EditableNodeModal } from '../structure/EditableNodeModal'
import { ReconciliationPanel } from '../reconciliation/ReconciliationPanel'

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

/* ── Pipeline step descriptions ── */

const PIPELINE_INFO: Record<string, { title: string; description: string }> = {
  process: {
    title: 'Шар 1 + 2: Обробка матеріалів',
    description:
      'Шар 1 — перетворення всіх матеріалів (відео, презентації, тексти, веб-сторінки) у текст. ' +
      'Ідемпотентні текстові "зліпки" кожного джерела.\n\n' +
      'Шар 2 — створення макроінформації (summary, теми, ключові концепти) та впорядкування ' +
      'основного тексту БЕЗ стиснення і втрат. Кожен матеріал отримує структурований outline.\n\n' +
      'Обидва шари генеруються автоматично при завантаженні матеріалу. ' +
      'Цей пункт дозволяє примусово перезапустити обробку.',
  },
  generate: {
    title: 'Структура курсу',
    description:
      'На основі Шару 2 (outlines всіх матеріалів) AI-архітектор створює ієрархічну структуру курсу: ' +
      'Модулі → Уроки → Концепти → Вправи.\n\n' +
      'Два проходи: знизу вгору (від листя до кореня) та зверху вниз (узгодження). ' +
      'Результат — editable дерево яке автор може правити вручну.',
  },
  reconcile: {
    title: 'Узгодження структури',
    description:
      'Перевірка консистентності згенерованої структури: термінологічні розбіжності, ' +
      'прогалини в покритті матеріалу, проблеми з порядком тем.\n\n' +
      'Показує список знайдених проблем. Автор обирає які виправлення прийняти.',
  },
  methodist: {
    title: 'Шар 3: Методичні матеріали',
    description:
      'Агент "Методист" аналізує структуру курсу і Шар 2 даних та створює для кожного вузла:\n\n' +
      '• Детальні цілі навчання\n' +
      '• Ключові концепти з визначеннями та зв\'язками\n' +
      '• Типові помилки студентів\n' +
      '• Рекомендовані завдання (тести, задачі, проєкти)\n' +
      '• Виявлені прогалини та протиріччя\n' +
      '• Рекомендації з покращення курсу\n\n' +
      'Два проходи: знизу вгору (деталізація) та зверху вниз (консистентність).',
  },
}

export function FlowContextMenu({ position, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [showRename, setShowRename] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showEditable, setShowEditable] = useState(false)
  const [showReconciliation, setShowReconciliation] = useState(false)
  const [showPipelineInfo, setShowPipelineInfo] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [renameTitle, setRenameTitle] = useState(position.nodeTitle)
  const [busy, setBusy] = useState(false)
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTree = useRefreshTree()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showAdd || showRename || showEditable || showReconciliation || showPipelineInfo) return
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose, showAdd, showRename, showEditable, showReconciliation, showPipelineInfo])

  // Cleanup hover timer
  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  const addChild = useCallback(async () => {
    if (!newTitle.trim()) return
    setBusy(true)
    try {
      await nodesApi.createChild(position.nodeId, { title: newTitle.trim() })
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
      if (position.isRoot) {
        useCourseStore.getState().reset()
        onClose()
        navigate('/')
      } else {
        await refreshTree()
        onClose()
      }
    } finally {
      setBusy(false)
    }
  }, [position, refreshTree, onClose, navigate])

  const generate = useCallback(async () => {
    setBusy(true)
    try {
      await generationApi.generate(position.nodeId, 'free')
      onClose()
    } finally {
      setBusy(false)
    }
  }, [position.nodeId, onClose])

  const processMaterials = useCallback(async () => {
    // Re-trigger ingestion for all materials in this node
    setBusy(true)
    try {
      const { documentsApi } = await import('../../api/documents')
      const documents = await documentsApi.list(position.nodeId)
      for (const doc of documents) {
        if (doc.state === 'error' || doc.state === 'ready') {
          await documentsApi.retry(doc.id)
        }
      }
      await refreshTree()
      onClose()
    } finally {
      setBusy(false)
    }
  }, [position.nodeId, refreshTree, onClose])

  const triggerMethodist = useCallback(async () => {
    setBusy(true)
    try {
      const { methodistApi } = await import('../../api/methodist')
      const plan = await methodistApi.trigger(position.nodeId)
      alert(
        `Методист запущено: ${plan.estimated_llm_calls} завдань в черзі.\n` +
        `Знизу вгору: ${plan.bottom_up_jobs.length}, зверху вниз: ${plan.top_down_jobs.length}`,
      )
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('422') || msg.includes('editable')) {
        alert('Спочатку згенеруйте структуру курсу.')
      } else {
        alert(`Помилка: ${msg}`)
      }
    } finally {
      setBusy(false)
    }
  }, [position.nodeId, onClose])

  const triggerUpload = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.pptx,.ppt,.mp4,.webm,.mp3,.wav,.m4a,.ogg,.flac,.txt,.html,.docx,.md'
    input.onchange = async () => {
      if (!input.files) return
      setBusy(true)
      const { documentsApi } = await import('../../api/documents')
      for (const file of Array.from(input.files)) {
        const type = guessSourceType(file.name)
        await documentsApi.upload(position.nodeId, file, type)
      }
      await refreshTree()
      setBusy(false)
      onClose()
    }
    input.click()
  }, [position.nodeId, refreshTree, onClose])

  const handleInfoHover = (key: string) => {
    hoverTimer.current = setTimeout(() => setHoveredInfo(key), 1500)
  }

  const handleInfoLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    setHoveredInfo(null)
  }

  type MenuItem = {
    icon: typeof FolderPlus
    label: string
    subtitle?: string
    action: () => void
    accent?: boolean
    danger?: boolean
    pipelineKey?: string
    dividerBefore?: boolean
  }

  const items: MenuItem[] = [
    { icon: FolderPlus, label: 'Додати підрозділ', action: () => setShowAdd(true) },
    { icon: Upload, label: 'Завантажити матеріал', action: triggerUpload },
    // ── Pipeline steps ──
    {
      icon: Zap,
      label: 'Обробити матеріали',
      subtitle: 'Шар 1 + 2',
      action: processMaterials,
      accent: true,
      pipelineKey: 'process',
      dividerBefore: true,
    },
    {
      icon: Sparkles,
      label: 'Згенерувати структуру',
      subtitle: 'Архітектор',
      action: generate,
      accent: true,
      pipelineKey: 'generate',
    },
    {
      icon: Scale,
      label: 'Узгодити структуру',
      subtitle: 'Консистентність',
      action: () => setShowReconciliation(true),
      accent: true,
      pipelineKey: 'reconcile',
    },
    {
      icon: GraduationCap,
      label: 'Згенерувати методичні',
      subtitle: 'Шар 3 · Методист',
      action: triggerMethodist,
      accent: true,
      pipelineKey: 'methodist',
    },
    // ── Edit actions ──
    {
      icon: Pencil,
      label: 'Перейменувати',
      action: () => setShowRename(true),
      dividerBefore: true,
    },
    { icon: BookOpen, label: 'Опис вузла', action: () => setShowEditable(true) },
    { icon: Trash2, label: 'Видалити', action: deleteNode, danger: true },
  ]

  return (
    <>
      <motion.div
        ref={ref}
        className="fixed z-50 bg-white rounded-xl shadow-card-lg border border-canvas-dark/40
                   py-1.5 min-w-[260px] overflow-hidden"
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
          <div key={item.label}>
            {item.dividerBefore && (
              <div className="h-px bg-canvas-dark/30 my-1" />
            )}
            <div className="flex items-center">
              <button
                onClick={item.action}
                disabled={busy}
                className={`
                  flex-1 flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
                  ${item.danger
                    ? 'text-coral hover:bg-coral-pale'
                    : item.accent
                      ? 'text-navy font-medium hover:bg-navy-pale'
                      : 'text-ink hover:bg-canvas-dark'}
                  disabled:opacity-50
                `}
              >
                <item.icon size={15} />
                <div className="text-left">
                  <span>{item.label}</span>
                  {item.subtitle && (
                    <span className="block text-[10px] text-ink-muted font-normal leading-tight">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </button>
              {item.pipelineKey && (
                <button
                  className="p-1.5 mr-1.5 rounded-lg hover:bg-canvas-dark transition-colors relative"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowPipelineInfo(item.pipelineKey!)
                  }}
                  onMouseEnter={() => handleInfoHover(item.pipelineKey!)}
                  onMouseLeave={handleInfoLeave}
                  title="Детальніше"
                >
                  <Info size={13} className="text-ink-muted" />
                </button>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {hoveredInfo && PIPELINE_INFO[hoveredInfo] && (
          <motion.div
            className="fixed z-[60] bg-ink text-white text-xs rounded-lg px-3 py-2 max-w-[280px]
                       shadow-lg pointer-events-none"
            style={{ left: position.x + 270, top: position.y + 60 }}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.15 }}
          >
            <p className="font-medium mb-1">{PIPELINE_INFO[hoveredInfo].title}</p>
            <p className="text-white/80 leading-relaxed whitespace-pre-line">
              {PIPELINE_INFO[hoveredInfo].description.slice(0, 120)}…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline info modal */}
      <Modal
        open={showPipelineInfo !== null}
        onClose={() => setShowPipelineInfo(null)}
        title={showPipelineInfo ? PIPELINE_INFO[showPipelineInfo]?.title || '' : ''}
      >
        {showPipelineInfo && PIPELINE_INFO[showPipelineInfo] && (
          <div className="text-sm text-ink leading-relaxed whitespace-pre-line">
            {PIPELINE_INFO[showPipelineInfo].description}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button
            className="btn-secondary btn-sm"
            onClick={() => setShowPipelineInfo(null)}
          >
            Зрозуміло
          </button>
        </div>
      </Modal>

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

      {/* Reconciliation panel */}
      <ReconciliationPanel
        nodeId={position.nodeId}
        nodeTitle={position.nodeTitle}
        open={showReconciliation}
        onClose={() => setShowReconciliation(false)}
      />
    </>
  )
}

function guessSourceType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext || '')) return 'audio'
  if (['mp4', 'webm'].includes(ext || '')) return 'video'
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
