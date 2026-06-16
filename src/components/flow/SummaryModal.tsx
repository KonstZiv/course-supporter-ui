import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { summaryApi, notYetGeneratedDetail } from '../../api/node-summary'
import { ApiError } from '../../api/client'
import { validationMessage } from '../../utils/apiError'
import type {
  LearningOutcomeItem,
  NodeSummaryEditView,
  NodeSummaryFinal,
  NodeSummaryFinalUpdate,
} from '../../types/api'

interface Props {
  nodeId: string
  onClose: () => void
  // Refresh the tree badge after approve / accept-raw / save (the badge's
  // materials_changed axis derives from a hash that an edit can move, so the
  // refresh keeps the tree honest even though PATCH never touches approved_at).
  onChanged: () => void
}

// The 10 editable fields (KD11 §1043-1054). Read-only family (concepts /
// enclosing_context / metrics / approval) is NEVER part of the draft.
type EditableDraft = Pick<
  NodeSummaryFinal,
  | 'title'
  | 'description'
  | 'learning_objectives'
  | 'knowledge'
  | 'skills'
  | 'success_criteria'
  | 'assessment_approach'
  | 'teaching_approach'
  | 'key_activities'
  | 'common_mistakes'
>

const EDITABLE_KEYS: (keyof EditableDraft)[] = [
  'title',
  'description',
  'learning_objectives',
  'knowledge',
  'skills',
  'success_criteria',
  'assessment_approach',
  'teaching_approach',
  'key_activities',
  'common_mistakes',
]

const SCALAR_KEYS = new Set<keyof EditableDraft>([
  'title',
  'description',
  'assessment_approach',
  'teaching_approach',
])

function pickEditable(f: NodeSummaryFinal): EditableDraft {
  return {
    title: f.title,
    description: f.description,
    learning_objectives: f.learning_objectives,
    knowledge: f.knowledge,
    skills: f.skills,
    success_criteria: f.success_criteria,
    assessment_approach: f.assessment_approach,
    teaching_approach: f.teaching_approach,
    key_activities: f.key_activities,
    common_mistakes: f.common_mistakes,
  }
}

/**
 * Partial PATCH body of ONLY the changed keys (Ratified #5).
 *
 * Scalars compare with ``!==``; lists / pairs compare with ``JSON.stringify``.
 * Serialization invariant: pair items are always built in canonical
 * ``{ name, description }`` field order (see PairEditor), so stringify is a
 * faithful equality check — a future field-order change must preserve it or
 * it would manufacture phantom diffs.
 */
function buildChangedKeys(
  draft: EditableDraft,
  original: EditableDraft,
): NodeSummaryFinalUpdate {
  const out: NodeSummaryFinalUpdate = {}
  for (const key of EDITABLE_KEYS) {
    const a = draft[key]
    const b = original[key]
    const changed = SCALAR_KEYS.has(key)
      ? a !== b
      : JSON.stringify(a) !== JSON.stringify(b)
    if (changed) {
      // Each key's value type matches NodeSummaryFinalUpdate by construction.
      Object.assign(out, { [key]: a })
    }
  }
  return out
}

/**
 * Wide review/edit modal for a NodeSummaryFinal.
 *
 * Overview (read-only) → explicit edit mode (Ratified #3): "Редагувати" turns
 * the 10 editable fields into prefilled inputs; "Зберегти" sends a partial
 * PATCH of only changed keys, takes the updated Final from the 200 response
 * (no blind refetch), and returns to overview. Concepts / enclosing_context /
 * metrics / approval stay read-only in both modes (Ratified #9 / Інваріант #3).
 */
export function SummaryModal({ nodeId, onClose, onChanged }: Props) {
  const [view, setView] = useState<NodeSummaryEditView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditableDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
        // directly (Інваріант #7).
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
        setView((v) => (v ? { ...v, final: updated } : v))
        onChanged()
      } finally {
        setActing(false)
      }
    },
    [nodeId, onChanged],
  )

  const enterEdit = useCallback(() => {
    if (!view) return
    setDraft(pickEditable(view.final))
    setSaveError(null)
    setEditing(true)
  }, [view])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setSaveError(null)
  }, [])

  const save = useCallback(async () => {
    if (!view || !draft) return
    const changed = buildChangedKeys(draft, pickEditable(view.final))
    if (Object.keys(changed).length === 0) return // guarded; Save is disabled
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await summaryApi.patchFinal(nodeId, changed)
      setView((v) => (v ? { ...v, final: updated } : v))
      setEditing(false)
      onChanged()
    } catch (err) {
      setSaveError(validationMessage(err) ?? 'Не вдалося зберегти зміни.')
    } finally {
      setSaving(false)
    }
  }, [nodeId, view, draft, onChanged])

  const hasChanges =
    view !== null &&
    draft !== null &&
    Object.keys(buildChangedKeys(draft, pickEditable(view.final))).length > 0

  return (
    <Modal open onClose={onClose} title="Опис вузла" wide>
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-navy" />
        </div>
      )}
      {error && <p className="text-coral text-sm py-4">{error}</p>}
      {view && !editing && (
        <Overview
          view={view}
          acting={acting}
          onEdit={enterEdit}
          onApprove={() => runAction(summaryApi.approve)}
          onAcceptRaw={() => runAction(summaryApi.acceptRaw)}
        />
      )}
      {view && editing && draft && (
        <EditForm
          view={view}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          saveError={saveError}
          hasChanges={hasChanges}
          onSave={save}
          onCancel={cancelEdit}
        />
      )}
    </Modal>
  )
}

/* ── Read-only overview ── */

function Overview({
  view,
  acting,
  onEdit,
  onApprove,
  onAcceptRaw,
}: {
  view: NodeSummaryEditView
  acting: boolean
  onEdit: () => void
  onApprove: () => void
  onAcceptRaw: () => void
}) {
  const f = view.final
  return (
    <div className="space-y-5 text-sm">
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
          <button className="btn-secondary btn-sm" onClick={onEdit} disabled={acting}>
            <Pencil size={14} />
            Редагувати
          </button>
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

      <ReadOnlyContext view={view} />
    </div>
  )
}

/* ── Edit mode (10 editable fields) ── */

function EditForm({
  view,
  draft,
  setDraft,
  saving,
  saveError,
  hasChanges,
  onSave,
  onCancel,
}: {
  view: NodeSummaryEditView
  draft: EditableDraft
  setDraft: (d: EditableDraft) => void
  saving: boolean
  saveError: string | null
  hasChanges: boolean
  onSave: () => void
  onCancel: () => void
}) {
  const patch = (p: Partial<EditableDraft>) => setDraft({ ...draft, ...p })
  return (
    <div className="space-y-5 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink-muted">Режим редагування</span>
        <div className="flex gap-2 shrink-0">
          <button className="btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
            Скасувати
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={onSave}
            disabled={saving || !hasChanges}
            title={hasChanges ? 'Зберегти зміни' : 'Немає змін'}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Зберегти
          </button>
        </div>
      </div>

      {saveError && (
        <p className="text-coral text-sm bg-coral-pale rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}

      <ScalarInput
        label="Заголовок"
        value={draft.title}
        placeholder="Методичний заголовок"
        onChange={(v) => patch({ title: v })}
      />
      <TextAreaInput
        label="Опис"
        value={draft.description}
        placeholder="Методичний опис вузла"
        onChange={(v) => patch({ description: v })}
      />
      <StringListEditor
        label="Навчальні цілі"
        items={draft.learning_objectives}
        onChange={(v) => patch({ learning_objectives: v })}
      />
      <PairEditor
        label="Знання (буде знати)"
        items={draft.knowledge}
        onChange={(v) => patch({ knowledge: v })}
      />
      <PairEditor
        label="Навички (буде вміти)"
        items={draft.skills}
        onChange={(v) => patch({ skills: v })}
      />
      <StringListEditor
        label="Критерії успіху"
        items={draft.success_criteria}
        onChange={(v) => patch({ success_criteria: v })}
      />
      <TextAreaInput
        label="Підхід до оцінювання"
        value={draft.assessment_approach}
        placeholder="Як перевіряється досягнення цілей"
        onChange={(v) => patch({ assessment_approach: v })}
      />
      <TextAreaInput
        label="Підхід до викладання"
        value={draft.teaching_approach}
        placeholder="Методика подачі матеріалу"
        onChange={(v) => patch({ teaching_approach: v })}
      />
      <StringListEditor
        label="Ключові активності"
        items={draft.key_activities}
        onChange={(v) => patch({ key_activities: v })}
      />
      <StringListEditor
        label="Типові помилки"
        items={draft.common_mistakes}
        onChange={(v) => patch({ common_mistakes: v })}
      />

      <ReadOnlyContext view={view} />
    </div>
  )
}

/* ── Shared read-only context (concepts / enclosing / metrics / observations) ── */

function ReadOnlyContext({ view }: { view: NodeSummaryEditView }) {
  const f = view.final
  return (
    <>
      <ChipField label="Основні концепти" items={f.main_concepts} />
      <ChipField label="Другорядні концепти" items={f.secondary_concepts} />
      <TextField label="Охоплюючий контекст" value={f.enclosing_context} />
      <ListField label="Спостереження методиста" items={view.raw_observations} />
      <div className="text-xs text-ink-muted border-t border-canvas-dark/30 pt-3">
        Документів: {f.own_documents_count} (з піддеревом{' '}
        {f.cumulative_documents_count}) · символів: {f.own_chars_count} (з
        піддеревом {f.cumulative_chars_count})
      </div>
    </>
  )
}

/* ── Read-only field renderers ── */

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

/* ── Edit-mode field editors (value-prefill, Ratified #4) ── */

function ScalarInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string | null
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <FieldShell label={label}>
      <input
        className="input"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  )
}

function TextAreaInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string | null
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <FieldShell label={label}>
      <textarea
        className="input min-h-[72px]"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  )
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const set = (i: number, v: string) =>
    onChange(items.map((it, idx) => (idx === i ? v : it)))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, ''])
  return (
    <FieldShell label={label}>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              className="input flex-1"
              value={item}
              onChange={(e) => set(i, e.target.value)}
            />
            <button
              className="p-2 rounded-lg hover:bg-coral-pale text-coral shrink-0"
              onClick={() => remove(i)}
              title="Видалити"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button className="btn-secondary btn-sm" onClick={add}>
          <Plus size={14} />
          Додати
        </button>
      </div>
    </FieldShell>
  )
}

function PairEditor({
  label,
  items,
  onChange,
}: {
  label: string
  items: LearningOutcomeItem[]
  onChange: (items: LearningOutcomeItem[]) => void
}) {
  // Canonical field order { name, description } — keeps JSON.stringify a
  // faithful change-detector (see buildChangedKeys).
  const set = (i: number, patch: Partial<LearningOutcomeItem>) =>
    onChange(
      items.map((it, idx) =>
        idx === i ? { name: it.name, description: it.description, ...patch } : it,
      ),
    )
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, { name: '', description: '' }])
  return (
    <FieldShell label={label}>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              className="input w-1/3"
              value={item.name}
              placeholder="Назва"
              onChange={(e) => set(i, { name: e.target.value })}
            />
            <input
              className="input flex-1"
              value={item.description}
              placeholder="Опис"
              onChange={(e) => set(i, { description: e.target.value })}
            />
            <button
              className="p-2 rounded-lg hover:bg-coral-pale text-coral shrink-0"
              onClick={() => remove(i)}
              title="Видалити"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button className="btn-secondary btn-sm" onClick={add}>
          <Plus size={14} />
          Додати пару
        </button>
      </div>
    </FieldShell>
  )
}
