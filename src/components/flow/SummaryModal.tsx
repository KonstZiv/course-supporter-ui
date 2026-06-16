import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { summaryApi, notYetGeneratedDetail } from '../../api/node-summary'
import { ApiError } from '../../api/client'
import type {
  LearningOutcomeItem,
  NodeSummaryEditView,
  NodeSummaryFinal,
} from '../../types/api'

interface Props {
  nodeId: string
  onClose: () => void
  // Refresh the tree badge after approve / accept-raw (draft → approved).
  onChanged: () => void
}

/**
 * Wide review/edit modal for a NodeSummaryFinal — overview (read-only) mode.
 *
 * Opens from the NodeDetailPanel affordance (c2). Fetches the combined
 * ``edit-view`` (final + raw_observations + previous_snapshot) once. This
 * commit (c3) renders the read-only overview + the approve / accept-raw
 * actions; the explicit edit mode (inputs + PATCH) lands in c4, the diff in
 * c5. Concepts / enclosing_context / metrics / approval are read-only and
 * rendered verbatim (Ratified #9).
 */
export function SummaryModal({ nodeId, onClose, onChanged }: Props) {
  const [view, setView] = useState<NodeSummaryEditView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    summaryApi.editView(nodeId).then(
      (v) => {
        if (cancelled) return
        setView(v)
        setLoading(false)
      },
      (err) => {
        if (cancelled) return
        setLoading(false)
        // Graceful 404 via the envelope extractor — never read body.reason
        // directly (Інваріант #7). The gate ``summary_status != none`` makes
        // this rare, but a stale tree / concurrent delete can still race.
        if (err instanceof ApiError && err.status === 404) {
          setError(
            notYetGeneratedDetail(err.body)
              ? 'Опис ще не згенеровано для цього вузла.'
              : 'Опис недоступний — вузол не знайдено.',
          )
          return
        }
        setError('Не вдалося завантажити опис.')
      },
    )
    return () => {
      cancelled = true
    }
  }, [nodeId])

  const runAction = useCallback(
    async (action: (id: string) => Promise<NodeSummaryFinal>) => {
      setActing(true)
      try {
        const updated = await action(nodeId)
        // Take the updated Final from the 200 response — no blind refetch.
        setView((v) => (v ? { ...v, final: updated } : v))
        onChanged()
      } finally {
        setActing(false)
      }
    },
    [nodeId, onChanged],
  )

  return (
    <Modal open onClose={onClose} title="Опис вузла" wide>
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-navy" />
        </div>
      )}
      {error && <p className="text-coral text-sm py-4">{error}</p>}
      {view && (
        <Overview
          view={view}
          acting={acting}
          onApprove={() => runAction(summaryApi.approve)}
          onAcceptRaw={() => runAction(summaryApi.acceptRaw)}
        />
      )}
    </Modal>
  )
}

/* ── Read-only overview ── */

function Overview({
  view,
  acting,
  onApprove,
  onAcceptRaw,
}: {
  view: NodeSummaryEditView
  acting: boolean
  onApprove: () => void
  onAcceptRaw: () => void
}) {
  const f = view.final
  return (
    <div className="space-y-5 text-sm">
      {/* Approval state */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {f.approved_at ? (
            <span className="inline-flex items-center gap-1.5 text-forest font-medium">
              <Check size={15} /> Затверджено
            </span>
          ) : (
            <span className="text-ink-muted">Чернетка — не затверджено</span>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="btn-secondary btn-sm"
            onClick={onAcceptRaw}
            disabled={acting}
            title="Перезаписати опис згенерованим (Raw) і затвердити"
          >
            {acting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Прийняти згенероване
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={onApprove}
            disabled={acting}
            title="Затвердити поточний опис"
          >
            {acting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Затвердити
          </button>
        </div>
      </div>

      {/* Editable family (read-only here; editing lands in c4) */}
      <TextField label="Заголовок" value={f.title} />
      <TextField label="Опис" value={f.description} />
      <ListField label="Навчальні цілі" items={f.learning_objectives} />
      <PairField label="Знання (буде знати)" items={f.knowledge} />
      <PairField label="Навички (буде вміти)" items={f.skills} />
      <ListField label="Критерії успіху" items={f.success_criteria} />
      <TextField label="Підхід до оцінювання" value={f.assessment_approach} />
      <TextField label="Підхід до викладання" value={f.teaching_approach} />
      <ListField label="Ключові активності" items={f.key_activities} />
      <ListField label="Типові помилки" items={f.common_mistakes} />

      {/* Read-only — concepts rendered verbatim, never transformed (Ratified #9) */}
      <ChipField label="Основні концепти" items={f.main_concepts} />
      <ChipField label="Другорядні концепти" items={f.secondary_concepts} />
      <TextField label="Охоплюючий контекст" value={f.enclosing_context} />

      {/* Methodist observations — shown before approve */}
      <ListField label="Спостереження методиста" items={view.raw_observations} />

      {/* Metrics (read-only) */}
      <div className="text-xs text-ink-muted border-t border-canvas-dark/30 pt-3">
        Документів: {f.own_documents_count} (з піддеревом{' '}
        {f.cumulative_documents_count}) · символів: {f.own_chars_count} (з
        піддеревом {f.cumulative_chars_count})
      </div>
    </div>
  )
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">{label}</p>
      {children}
    </div>
  )
}

function TextField({ label, value }: { label: string; value: string | null }) {
  return (
    <FieldShell label={label}>
      {value ? (
        <p className="text-ink whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-ink-muted italic">—</p>
      )}
    </FieldShell>
  )
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <FieldShell label={label}>
      {items.length > 0 ? (
        <ul className="list-disc list-inside text-ink space-y-0.5">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted italic">—</p>
      )}
    </FieldShell>
  )
}

function PairField({ label, items }: { label: string; items: LearningOutcomeItem[] }) {
  return (
    <FieldShell label={label}>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-ink">
              <span className="font-medium">{item.name}</span>
              {item.description ? (
                <span className="text-ink-muted"> — {item.description}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted italic">—</p>
      )}
    </FieldShell>
  )
}

function ChipField({ label, items }: { label: string; items: string[] }) {
  return (
    <FieldShell label={label}>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-full bg-canvas-dark/60 text-ink"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-ink-muted italic">—</p>
      )}
    </FieldShell>
  )
}
