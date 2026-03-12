import { useCallback, useEffect, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { EditableTreeResponse, EditableNodeResponse } from '../../types/api'
import { editableApi } from '../../api/editable'
import { EditableNodeCard } from './EditableNodeCard'

interface EditableTreeProps {
  nodeId: string
}

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

export function EditableTree({ nodeId }: EditableTreeProps) {
  const [tree, setTree] = useState<EditableTreeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await editableApi.getTree(nodeId)
      setTree(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не вдалося завантажити структуру'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    load()
  }, [load])

  const handleNodeUpdated = useCallback((updated: EditableNodeResponse) => {
    setTree((prev) => {
      if (!prev) return prev
      return { ...prev, nodes: updateNodeInTree(prev.nodes, updated) }
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-navy" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle size={20} className="text-coral" />
        <p className="text-sm text-ink-muted">{error}</p>
        <button
          onClick={load}
          className="text-sm text-navy hover:underline flex items-center gap-1"
        >
          <RefreshCw size={12} /> Спробувати знову
        </button>
      </div>
    )
  }

  if (!tree || tree.nodes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-ink-muted">
          Структура ще не згенерована
        </p>
        <p className="text-xs text-ink-muted mt-1">
          Запустіть генерацію, щоб побачити результат
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs text-ink-muted">
          {tree.nodes.length} {tree.nodes.length === 1 ? 'вузол' : 'вузлів'}
        </span>
        <button
          onClick={load}
          className="p-1 rounded hover:bg-canvas-dark/30 transition-colors"
          title="Оновити"
        >
          <RefreshCw size={12} className="text-ink-muted" />
        </button>
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
  )
}
