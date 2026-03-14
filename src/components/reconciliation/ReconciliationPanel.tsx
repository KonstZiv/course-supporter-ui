import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { reconciliationApi } from '../../api/reconciliation'
import { jobsApi } from '../../api/jobs'
import { ApiError } from '../../api/client'
import { usePolling } from '../../hooks/usePolling'
import { useReconciliationStore } from '../../stores/reconciliation'
import { IssueCard } from './IssueCard'
import { ReconciliationSummary } from './ReconciliationSummary'
import type {
  ReconciliationPreviewResponse,
  EditableTreeResponse,
} from '../../types/api'

type Phase = 'loading' | 'polling' | 'result' | 'applying' | 'done' | 'error'

interface Props {
  nodeId: string
  nodeTitle: string
  open: boolean
  onClose: () => void
  onApplied?: (tree: EditableTreeResponse) => void
}

const STALE_LABELS: Record<string, string> = {
  stale_materials: 'Матеріали змінились з моменту останнього аналізу',
  stale_edited: 'Структура була відредагована після аналізу',
  stale_both: 'Матеріали та структура змінились після аналізу',
}

export function ReconciliationPanel({ nodeId, nodeTitle, open, onClose, onApplied }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [jobId, setJobId] = useState<string | null>(null)
  const [preview, setPreview] = useState<ReconciliationPreviewResponse | null>(null)
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [staleness, setStaleness] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const reconState = useReconciliationStore((s) => s.nodes[nodeId])
  const setNodeStatus = useReconciliationStore((s) => s.setNodeStatus)

  const startTimer = useCallback(() => {
    setElapsedSec(0)
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  // On open: check store / fetch status
  useEffect(() => {
    if (!open) return
    setAccepted(new Set())
    setError(null)
    setStaleness(null)

    let cancelled = false

    async function init() {
      // Check store first
      if (reconState?.preview && reconState.freshness === 'fresh') {
        setPreview(reconState.preview)
        setAccepted(new Set(reconState.preview.issues.map((i) => i.id)))
        setPhase('result')
        return
      }

      // If polling in progress, show spinner
      if (reconState?.jobStatus === 'queued' || reconState?.jobStatus === 'active') {
        setJobId(reconState.jobId)
        setPhase('polling')
        startTimer()
        return
      }

      // Fetch status from API
      setPhase('loading')
      try {
        const status = await reconciliationApi.getStatus(nodeId)
        if (cancelled) return

        // Update store
        setNodeStatus(nodeId, {
          jobId: status.job_id,
          jobStatus: status.job_status as 'queued' | 'active' | 'complete' | 'failed' | null,
          preview: status.preview,
          freshness: status.freshness,
        })

        if (status.job_status === 'queued' || status.job_status === 'active') {
          setJobId(status.job_id)
          setPhase('polling')
          startTimer()
          return
        }

        if (status.has_preview && status.preview) {
          setPreview(status.preview)
          setAccepted(new Set(status.preview.issues.map((i) => i.id)))
          if (status.freshness !== 'fresh') {
            setStaleness(status.freshness)
          }
          setPhase('result')
          return
        }

        // No preview — trigger new one
        await triggerPreview()
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не вдалося завантажити статус')
        setPhase('error')
      }
    }

    async function triggerPreview() {
      try {
        const job = await reconciliationApi.preview(nodeId)
        if (cancelled) return
        setJobId(job.id)
        setNodeStatus(nodeId, { jobId: job.id, jobStatus: 'queued' })
        setPhase('polling')
        startTimer()
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не вдалося запустити аналіз')
        setPhase('error')
      }
    }

    init()
    return () => {
      cancelled = true
      stopTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodeId])

  // Poll job status
  const pollFn = useCallback(async (): Promise<boolean> => {
    if (!jobId) return false
    const job = await jobsApi.get(jobId)

    if (job.status === 'complete') {
      stopTimer()
      try {
        const result = await reconciliationApi.getResult(nodeId, jobId)
        setPreview(result)
        const allIds = new Set(result.issues.map((i) => i.id))
        setAccepted(allIds)
        setPhase('result')

        // Update store
        setNodeStatus(nodeId, {
          jobId,
          jobStatus: 'complete',
          preview: result,
          freshness: 'fresh',
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не вдалося отримати результат')
        setPhase('error')
      }
      return true
    }

    if (job.status === 'failed') {
      stopTimer()
      setError(job.error_message || 'Завдання завершилось з помилкою')
      setPhase('error')
      setNodeStatus(nodeId, { jobId, jobStatus: 'failed' })
      return true
    }

    return false
  }, [jobId, nodeId, stopTimer, setNodeStatus])

  usePolling(pollFn, 3000, phase === 'polling' && jobId !== null)

  // Toggle issue acceptance
  const toggle = useCallback((id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (!preview) return
    setAccepted(new Set(preview.issues.map((i) => i.id)))
  }, [preview])

  const deselectAll = useCallback(() => {
    setAccepted(new Set())
  }, [])

  // Apply
  const apply = useCallback(async () => {
    if (!preview || accepted.size === 0) return
    setPhase('applying')
    try {
      const tree = await reconciliationApi.apply(
        nodeId,
        Array.from(accepted),
        preview.issues,
      )
      setPhase('done')
      onApplied?.(tree)
      setTimeout(onClose, 800)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.body ? JSON.stringify((e.body as Record<string, unknown>).detail) : e.message)
      } else {
        setError(e instanceof Error ? e.message : 'Помилка при застосуванні')
      }
      setPhase('error')
    }
  }, [preview, accepted, nodeId, onApplied, onClose])

  // Refresh — trigger new preview
  const refresh = useCallback(async () => {
    setPhase('polling')
    setPreview(null)
    setStaleness(null)
    setAccepted(new Set())
    setError(null)
    setJobId(null)

    try {
      const job = await reconciliationApi.preview(nodeId)
      setJobId(job.id)
      setNodeStatus(nodeId, { jobId: job.id, jobStatus: 'queued' })
      startTimer()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося запустити аналіз')
      setPhase('error')
    }
  }, [nodeId, startTimer, setNodeStatus])

  return (
    <Modal open={open} onClose={onClose} title={`Узгодження: ${nodeTitle}`} wide>
      {/* Loading initial status */}
      {phase === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="animate-spin text-navy" />
          <p className="text-sm text-ink">Завантаження...</p>
        </div>
      )}

      {/* Polling / loading */}
      {phase === 'polling' && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="animate-spin text-navy" />
          <p className="text-sm text-ink">Аналіз узгодженості...</p>
          <span className="text-xs text-ink-muted tabular-nums">{elapsedSec}с</span>
          {elapsedSec > 30 && (
            <p className="text-xs text-ink-muted">Це може зайняти до хвилини</p>
          )}
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle size={24} className="text-coral" />
          <p className="text-sm text-ink-muted max-w-md">{error}</p>
          <button
            onClick={refresh}
            className="text-sm text-navy hover:underline flex items-center gap-1"
          >
            <RefreshCw size={12} /> Спробувати знову
          </button>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="flex flex-col items-center gap-3 py-20">
          <CheckCircle2 size={28} className="text-green-600" />
          <p className="text-sm text-ink">Зміни застосовано</p>
        </div>
      )}

      {/* Applying */}
      {phase === 'applying' && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="animate-spin text-navy" />
          <p className="text-sm text-ink">Застосування змін...</p>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && preview && (
        <div className="space-y-4">
          {/* Staleness warning */}
          {staleness && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Результат може бути неактуальним</p>
                <p>{STALE_LABELS[staleness] ?? staleness}</p>
                <button
                  onClick={refresh}
                  className="text-amber-700 underline mt-1 inline-flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Оновити
                </button>
              </div>
            </div>
          )}

          {/* Context summary */}
          {preview.context_summary && (
            <p className="text-xs text-ink-muted bg-canvas-dark/30 rounded-lg px-3 py-2">
              {preview.context_summary}
            </p>
          )}

          {/* Summary badges */}
          <ReconciliationSummary issues={preview.issues} acceptedCount={accepted.size} />

          {/* Select controls */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-navy hover:underline"
            >
              Обрати все
            </button>
            <span className="text-xs text-ink-muted">·</span>
            <button
              onClick={deselectAll}
              className="text-xs text-navy hover:underline"
            >
              Зняти все
            </button>
          </div>

          {/* Issue cards */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {preview.issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                accepted={accepted.has(issue.id)}
                onToggle={() => toggle(issue.id)}
              />
            ))}
          </div>

          {/* No issues */}
          {preview.issues.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 size={24} className="text-green-600 mx-auto mb-2" />
              <p className="text-sm text-ink-muted">Проблем не знайдено</p>
            </div>
          )}

          {/* Actions */}
          {preview.issues.length > 0 && (
            <div className="flex justify-end gap-2 pt-2 border-t border-canvas-dark/30">
              <button className="btn-secondary btn-sm" onClick={onClose}>
                Скасувати
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={apply}
                disabled={accepted.size === 0}
              >
                Застосувати ({accepted.size})
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
