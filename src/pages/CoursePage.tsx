import { useEffect, useCallback, type DragEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { nodesApi } from '../api/nodes'
import { useCourseStore } from '../stores/course'
import { CourseCanvas } from '../components/flow/CourseCanvas'
import { NodeDetailPanel } from '../components/flow/NodeDetailPanel'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'

export function CoursePage() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const tree = useCourseStore((s) => s.tree)
  const selectedNodeId = useCourseStore((s) => s.selectedNodeId)
  const loading = useCourseStore((s) => s.loading)
  const error = useCourseStore((s) => s.error)

  // Prevent browser from opening dropped files outside the dropzone
  const preventDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
  }, [])

  useEffect(() => {
    if (!nodeId) return
    const { setLoading, setTree, setError } = useCourseStore.getState()
    let cancelled = false

    setLoading(true)
    nodesApi.getDetail(nodeId).then(
      (detail) => {
        if (cancelled) return
        const node = Array.isArray(detail) ? detail[0] : detail
        setTree(node)
        setLoading(false)
      },
      (err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Не вдалося завантажити курс')
      },
    )

    return () => {
      cancelled = true
      useCourseStore.getState().reset()
    }
  }, [nodeId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] px-6">
        <AlertTriangle size={40} className="text-coral mb-4" />
        <p className="text-ink text-lg mb-2">Помилка завантаження</p>
        <p className="text-ink-muted text-sm mb-4">{error}</p>
        <Link to="/" className="btn-primary">
          <ArrowLeft size={16} />
          До списку курсів
        </Link>
      </div>
    )
  }

  if (!tree) return null

  return (
    <div
      className="h-[calc(100vh-64px)] flex flex-col"
      onDragOver={preventDrop}
      onDrop={preventDrop}
    >
      {/* Top bar */}
      <div className="px-6 py-3 border-b border-canvas-dark/40 bg-white/60 backdrop-blur-sm
                      flex items-center gap-4">
        <Link
          to="/"
          className="p-2 rounded-lg hover:bg-canvas-dark transition-colors"
          title="До списку курсів"
        >
          <ArrowLeft size={18} className="text-ink-muted" />
        </Link>
        <div>
          <h1 className="font-display text-xl text-ink">{tree.title}</h1>
          {tree.description && (
            <p className="text-ink-muted text-sm">{tree.description}</p>
          )}
        </div>
      </div>

      {/* Canvas + detail panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <CourseCanvas />
        </div>
        {selectedNodeId && <NodeDetailPanel />}
      </div>
    </div>
  )
}
