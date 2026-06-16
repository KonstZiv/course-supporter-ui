import { useEffect, useCallback, useState, type DragEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { nodesApi } from '../api/nodes'
import { summaryApi, uncoveredStaleDetail } from '../api/node-summary'
import { ApiError } from '../api/client'
import { useCourseStore } from '../stores/course'
import { useJobPolling } from '../hooks/useJobPolling'
import { CourseCanvas } from '../components/flow/CourseCanvas'
import { NodeDetailPanel } from '../components/flow/NodeDetailPanel'
import { RunStatePanel } from '../components/flow/RunStatePanel'
import { RejectionNotice } from '../components/flow/RejectionNotice'
import { ArrowLeft, Loader2, AlertTriangle, Pencil, Check, X } from 'lucide-react'
import { LanguageSelect, LanguageBadge } from '../components/ui/LanguageSelect'
import type { JobResponse, UncoveredStaleNodesDetail } from '../types/api'

// One bottom-right slot, mutually exclusive: a polled run, OR a 422 rejection
// (returned before any job exists). Local to the page — never Zustand
// (Інваріант 1). Does not survive node navigation / reload by design
// (DD-3.2.5a-A).
type GenerationSlot =
  | { kind: 'run'; jobId: string; job: JobResponse; nodeTitle: string }
  | {
      kind: 'rejection'
      detail: UncoveredStaleNodesDetail
      nodeId: string
      nodeTitle: string
    }

export function CoursePage() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const tree = useCourseStore((s) => s.tree)
  const setTree = useCourseStore((s) => s.setTree)
  const selectedNodeId = useCourseStore((s) => s.selectedNodeId)
  const loading = useCourseStore((s) => s.loading)
  const error = useCourseStore((s) => s.error)

  const [editingLang, setEditingLang] = useState(false)
  const [draftLang, setDraftLang] = useState<string | null>(null)
  const [savingLang, setSavingLang] = useState(false)

  // Generation run-state slot (Task 3.2.5a).
  const [slot, setSlot] = useState<GenerationSlot | null>(null)

  // Final review/edit modal open-state (Task 3.2.5b c2). The affordance in
  // NodeDetailPanel sets the node id; the wide modal that consumes it lands
  // in c3 (which expands this to read the value and render the modal).
  const [, setSummaryNodeId] = useState<string | null>(null)

  const runGeneration = useCallback(
    async (nodeId: string, nodeTitle: string, force: boolean) => {
      try {
        const job = await summaryApi.generate(nodeId, force)
        setSlot({ kind: 'run', jobId: job.id, job, nodeTitle })
      } catch (err) {
        // Unwrap the FastAPI ``{detail: ...}`` envelope, then narrow by the
        // EXACT reason — ``not_yet_generated`` (sibling routes) must NOT land
        // here (Інваріант 4).
        if (err instanceof ApiError && err.status === 422) {
          const detail = uncoveredStaleDetail(err.body)
          if (detail) {
            setSlot({ kind: 'rejection', detail, nodeId, nodeTitle })
            return
          }
        }
        throw err
      }
    },
    [],
  )

  const handleGenerate = useCallback(
    (nodeId: string, nodeTitle: string) => {
      void runGeneration(nodeId, nodeTitle, false)
    },
    [runGeneration],
  )

  // Poll only when the slot holds an active run. Hook is called
  // unconditionally with derived args (no conditional hooks).
  const runJobId = slot?.kind === 'run' ? slot.jobId : null
  const runInitialJob = slot?.kind === 'run' ? slot.job : null
  const polledJob = useJobPolling(runJobId, runInitialJob)

  const startEditLang = () => {
    setDraftLang(tree?.default_language ?? null)
    setEditingLang(true)
  }

  const saveLang = async () => {
    if (!tree) return
    setSavingLang(true)
    try {
      const updated = await nodesApi.update(tree.id, { default_language: draftLang })
      setTree({ ...tree, default_language: updated.default_language })
      setEditingLang(false)
    } finally {
      setSavingLang(false)
    }
  }

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
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl text-ink">{tree.title}</h1>
          {tree.description && (
            <p className="text-ink-muted text-sm">{tree.description}</p>
          )}
        </div>

        {/* Course language — inline view / editor */}
        <div className="flex items-center gap-2 shrink-0">
          {editingLang ? (
            <>
              <LanguageSelect
                value={draftLang}
                onChange={setDraftLang}
                autoLabel="Автовизначення"
                disabled={savingLang}
                className="min-w-[200px]"
              />
              <button
                className="p-2 rounded-lg hover:bg-forest-pale text-forest"
                onClick={saveLang}
                disabled={savingLang}
                title="Зберегти"
              >
                {savingLang ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
              </button>
              <button
                className="p-2 rounded-lg hover:bg-canvas-dark text-ink-muted"
                onClick={() => setEditingLang(false)}
                disabled={savingLang}
                title="Скасувати"
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                         hover:bg-canvas-dark text-sm"
              onClick={startEditLang}
              title="Змінити мову курсу"
            >
              <LanguageBadge code={tree.default_language} />
              <Pencil size={12} className="text-ink-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas + detail panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <CourseCanvas onGenerate={handleGenerate} />
        </div>
        {selectedNodeId && <NodeDetailPanel onOpenSummary={setSummaryNodeId} />}
      </div>

      {/* Generation run-state slot (bottom-right, mutually exclusive) */}
      {slot?.kind === 'run' && polledJob && (
        <RunStatePanel
          job={polledJob}
          nodeTitle={slot.nodeTitle}
          onDismiss={() => setSlot(null)}
        />
      )}
      {slot?.kind === 'rejection' && (
        <RejectionNotice
          detail={slot.detail}
          nodeTitle={slot.nodeTitle}
          onRetryForce={() =>
            void runGeneration(slot.nodeId, slot.nodeTitle, true)
          }
          onDismiss={() => setSlot(null)}
        />
      )}
    </div>
  )
}
