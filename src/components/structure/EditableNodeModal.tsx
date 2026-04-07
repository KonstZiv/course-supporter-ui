import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw, Scale, Ruler, GraduationCap } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { editableApi } from '../../api/editable'
import { ApiError } from '../../api/client'
import { EditableNodeCard } from './EditableNodeCard'
import { MethodistPanel } from './MethodistPanel'
import { ReconciliationPanel } from '../reconciliation/ReconciliationPanel'
import type { EditableTreeResponse, EditableNodeResponse } from '../../types/api'

interface EditableNodeModalProps {
  nodeId: string
  nodeTitle: string
  open: boolean
  onClose: () => void
}

type Tab = 'structure' | 'methodist'

function updateNodeInTree(
  nodes: EditableNodeResponse[],
  updated: EditableNodeResponse,
): EditableNodeResponse[] {
  return nodes.map((n) => {
    if (n.id === updated.id) {
      return { ...updated, children: n.children }
    }
    if (n.children.length > 0) {
      return { ...n, children: updateNodeInTree(n.children, updated) }
    }
    return n
  })
}

export function EditableNodeModal({ nodeId, nodeTitle, open, onClose }: EditableNodeModalProps) {
  const [tree, setTree] = useState<EditableTreeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showReconciliation, setShowReconciliation] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('structure')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const data = await editableApi.getTree(nodeId)
      setTree(data)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true)
      } else {
        const msg = e instanceof Error ? e.message : 'Не вдалося завантажити структуру'
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    if (open) {
      setTree(null)
      setActiveTab('structure')
      load()
    }
  }, [open, load])

  const handleNodeUpdated = useCallback((updated: EditableNodeResponse) => {
    setTree((prev) => {
      if (!prev) return prev
      return { ...prev, nodes: updateNodeInTree(prev.nodes, updated) }
    })
  }, [])

  return (
  <>
    <Modal open={open} onClose={onClose} title={nodeTitle} wide>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-canvas-dark/30">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'structure'
              ? 'border-navy text-navy'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Ruler size={14} />
          Структура
        </button>
        <button
          onClick={() => setActiveTab('methodist')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'methodist'
              ? 'border-plum text-plum'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <GraduationCap size={14} />
          Методичні матеріали
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'structure' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-navy" />
            </div>
          ) : notFound ? (
            <div className="text-center py-16">
              <p className="text-sm text-ink-muted">
                Структура ще не згенерована
              </p>
              <p className="text-xs text-ink-muted mt-1">
                Запустіть генерацію, щоб побачити результат
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle size={20} className="text-coral" />
              <p className="text-sm text-ink-muted">{error}</p>
              <button
                onClick={load}
                className="text-sm text-navy hover:underline flex items-center gap-1"
              >
                <RefreshCw size={12} /> Спробувати знову
              </button>
            </div>
          ) : tree && tree.nodes.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs text-ink-muted">
                  {tree.nodes.length} {tree.nodes.length === 1 ? 'вузол' : 'вузлів'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowReconciliation(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-navy hover:bg-navy-pale transition-colors"
                    title="Узгодити структуру"
                  >
                    <Scale size={12} />
                    Узгодити
                  </button>
                  <button
                    onClick={load}
                    className="p-1 rounded hover:bg-canvas-dark/30 transition-colors"
                    title="Оновити"
                  >
                    <RefreshCw size={12} className="text-ink-muted" />
                  </button>
                </div>
              </div>
              {tree.nodes.map((node) => (
                <EditableNodeCard
                  key={node.id}
                  node={node}
                  nodeId={nodeId}
                  onNodeUpdated={handleNodeUpdated}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm text-ink-muted">
                Структура ще не згенерована
              </p>
              <p className="text-xs text-ink-muted mt-1">
                Запустіть генерацію, щоб побачити результат
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'methodist' && (
        <MethodistPanel nodeId={nodeId} />
      )}
    </Modal>

    <ReconciliationPanel
      nodeId={nodeId}
      nodeTitle={nodeTitle}
      open={showReconciliation}
      onClose={() => setShowReconciliation(false)}
      onApplied={() => load()}
    />
  </>
  )
}
