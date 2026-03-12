import { useState, useCallback, useRef, useEffect } from 'react'
import { Pencil, Check } from 'lucide-react'

type FieldType = 'text' | 'short' | 'number' | 'list' | 'structured_list'

interface EditableFieldProps {
  label: string
  fieldName: string
  value: unknown
  type: FieldType
  isEdited: boolean
  onSave: (fieldName: string, value: unknown) => void
}

function resolveValue(value: unknown, type: FieldType): string {
  if (value == null) return ''
  if (type === 'list') {
    return Array.isArray(value) ? (value as string[]).join('\n') : String(value)
  }
  if (type === 'structured_list') {
    return Array.isArray(value) ? JSON.stringify(value, null, 2) : String(value)
  }
  return String(value)
}

function parseValue(raw: string, type: FieldType): unknown {
  if (type === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? null : n
  }
  if (type === 'list') {
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (type === 'structured_list') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return raw || null
}

export function EditableField({ label, fieldName, value, type, isEdited, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => resolveValue(value, type))
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!editing) {
      setDraft(resolveValue(value, type))
    }
  }, [value, type, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  const flashSaved = useCallback(() => {
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
  }, [])

  const handleSave = useCallback(() => {
    const parsed = parseValue(draft, type)
    const original = resolveValue(value, type)
    if (draft !== original) {
      onSave(fieldName, parsed)
      flashSaved()
    }
    setEditing(false)
  }, [draft, type, value, fieldName, onSave, flashSaved])

  const handleChange = useCallback(
    (newDraft: string) => {
      setDraft(newDraft)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const parsed = parseValue(newDraft, type)
        const original = resolveValue(value, type)
        if (newDraft !== original) {
          onSave(fieldName, parsed)
          flashSaved()
        }
      }, 1200)
    },
    [type, value, fieldName, onSave, flashSaved],
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const displayValue = resolveValue(value, type)
  const isEmpty = !displayValue

  if (!editing) {
    return (
      <div className="group/field">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-ink-muted">{label}</span>
          {isEdited && (
            <Pencil size={10} className="text-amber" />
          )}
          {saved && (
            <span className="flex items-center gap-0.5 text-[10px] text-forest animate-fade-in">
              <Check size={10} />
              Збережено
            </span>
          )}
        </div>
        <div
          onClick={() => setEditing(true)}
          className={`group/value relative text-sm rounded-md px-2 py-1 cursor-pointer transition-colors
            ${isEmpty ? 'text-ink-muted italic bg-canvas-dark/20' : 'text-ink bg-white hover:bg-canvas-dark/20'}
            border border-transparent hover:border-navy/30`}
        >
          {isEmpty ? 'Натисніть щоб заповнити' : (
            type === 'structured_list' ? (
              <StructuredListView value={value} />
            ) : type === 'list' ? (
              <ul className="list-disc list-inside">
                {(value as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <span className="whitespace-pre-wrap">{displayValue}</span>
            )
          )}
          <Pencil
            size={12}
            className="absolute top-1.5 right-1.5 text-ink-muted opacity-0 group-hover/value:opacity-100 transition-opacity"
          />
        </div>
      </div>
    )
  }

  const isMultiline = type === 'text' || type === 'list' || type === 'structured_list'

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs text-ink-muted">{label}</span>
        {isEdited && <Pencil size={10} className="text-amber" />}
        <span className="text-[10px] text-ink-muted ml-auto">Автозбереження</span>
      </div>
      {isMultiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleSave}
          rows={type === 'structured_list' ? 8 : 3}
          className="w-full text-sm rounded-md px-2 py-1 border border-navy/30 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none resize-y font-mono"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full text-sm rounded-md px-2 py-1 border border-navy/30 focus:border-navy focus:ring-1 focus:ring-navy/20 outline-none"
        />
      )}
      {type === 'list' && (
        <span className="text-[10px] text-ink-muted mt-0.5 block">Кожен елемент з нового рядка</span>
      )}
    </div>
  )
}

/** Renders a structured_list in a human-readable format instead of raw JSON. */
function StructuredListView({ value }: { value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) {
    return <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
  }

  const first = value[0]

  // Array of objects with summary/details keys (expected_knowledge, expected_skills, key_concepts)
  if (
    typeof first === 'object' &&
    first !== null &&
    'summary' in first
  ) {
    return (
      <ul className="space-y-1">
        {value.map((item: { summary: string; details?: string }, i: number) => (
          <li key={i} className="text-sm">
            <span className="text-ink">{item.summary}</span>
            {item.details && (
              <p className="text-xs text-ink-muted mt-0.5 ml-2">{item.details}</p>
            )}
          </li>
        ))}
      </ul>
    )
  }

  // Array of objects with arbitrary keys — render as compact cards
  if (typeof first === 'object' && first !== null) {
    return (
      <div className="space-y-1.5">
        {value.map((item: Record<string, unknown>, i: number) => (
          <div key={i} className="text-xs bg-canvas rounded-md px-2 py-1.5 space-y-0.5">
            {Object.entries(item).map(([key, val]) => (
              <div key={key} className="flex gap-1.5">
                <span className="text-ink-muted shrink-0">{key}:</span>
                <span className="text-ink break-all">{String(val ?? '')}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Fallback: formatted JSON
  return <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</pre>
}
