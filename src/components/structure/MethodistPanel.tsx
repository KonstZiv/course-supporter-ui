import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import Markdown from 'react-markdown'
import { methodistApi } from '../../api/methodist'
import type { MethodistNodeResult } from '../../api/methodist'

interface MethodistPanelProps {
  nodeId: string
}

export function MethodistPanel({ nodeId }: MethodistPanelProps) {
  const [results, setResults] = useState<MethodistNodeResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await methodistApi.getResults(nodeId)
      setResults(data)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [nodeId])

  useEffect(() => {
    load()
  }, [load])

  const handleTrigger = useCallback(async () => {
    setTriggering(true)
    setError(null)
    try {
      const plan = await methodistApi.trigger(nodeId)
      alert(
        `Методист запущено: ${plan.estimated_llm_calls} завдань.\n` +
        `Результати з'являться після завершення обробки.`,
      )
      // Reload after small delay
      setTimeout(() => load(), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('422')) {
        setError('Спочатку згенеруйте структуру курсу.')
      } else {
        setError(`Помилка: ${msg}`)
      }
    } finally {
      setTriggering(false)
    }
  }, [nodeId, load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-navy" />
      </div>
    )
  }

  const hasAnyOutput = results?.some((r) => r.has_methodist_output) ?? false

  if (!hasAnyOutput) {
    return (
      <div className="text-center py-16">
        <GraduationCap size={32} className="mx-auto mb-3 text-ink-muted" />
        <p className="text-sm text-ink-muted">
          Методичні матеріали ще не згенеровані
        </p>
        <p className="text-xs text-ink-muted mt-1 mb-4">
          Методист створить детальні методичні документи для кожного вузла структури
        </p>
        {error && (
          <p className="text-xs text-coral mb-3">{error}</p>
        )}
        <button
          className="btn-primary btn-sm"
          onClick={handleTrigger}
          disabled={triggering}
        >
          {triggering ? (
            <Loader2 size={14} className="animate-spin mr-1.5 inline" />
          ) : (
            <GraduationCap size={14} className="mr-1.5 inline" />
          )}
          Запустити Методиста
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs text-ink-muted">
          {results!.filter((r) => r.has_methodist_output).length} з {results!.length} вузлів оброблено
        </span>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-navy hover:bg-navy-pale transition-colors"
          onClick={handleTrigger}
          disabled={triggering}
        >
          <GraduationCap size={12} />
          {triggering ? 'Запуск...' : 'Перезапустити'}
        </button>
      </div>
      {results!.map((node) => (
        <MethodistNodeCard key={node.editable_id} node={node} />
      ))}
    </div>
  )
}

/* ── Single node accordion ── */

const NODE_TYPE_STYLES: Record<string, string> = {
  module: 'bg-navy/5 border-navy/20',
  lesson: 'bg-forest/5 border-forest/20',
  concept: 'bg-plum/5 border-plum/20',
  exercise: 'bg-amber/5 border-amber/20',
}

const NODE_TYPE_LABELS: Record<string, string> = {
  module: 'Модуль',
  lesson: 'Урок',
  concept: 'Концепт',
  exercise: 'Вправа',
}

function MethodistNodeCard({ node }: { node: MethodistNodeResult }) {
  const [expanded, setExpanded] = useState(false)
  const style = NODE_TYPE_STYLES[node.node_type] || 'bg-canvas border-canvas-dark/30'
  const label = NODE_TYPE_LABELS[node.node_type] || node.node_type

  return (
    <div className={`rounded-xl border ${style} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown size={14} className="text-ink-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-ink-muted shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-ink">{node.title}</span>
          <span className="ml-2 text-[10px] text-ink-muted">{label}</span>
        </div>
        {node.has_methodist_output ? (
          <CheckCircle2 size={14} className="text-forest shrink-0" />
        ) : (
          <AlertTriangle size={14} className="text-amber shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-inherit">
          {node.methodological_markdown ? (
            <div className="prose prose-sm max-w-none mt-3
                          prose-headings:text-ink prose-headings:font-display
                          prose-h2:text-base prose-h3:text-sm
                          prose-p:text-ink-muted prose-p:text-sm
                          prose-li:text-ink-muted prose-li:text-sm
                          prose-strong:text-ink">
              <Markdown>{node.methodological_markdown}</Markdown>
            </div>
          ) : (
            <p className="text-xs text-ink-muted py-3">
              Очікує обробки Методистом...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
