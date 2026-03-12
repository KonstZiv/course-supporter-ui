import { useState, useCallback } from 'react'
import { ChevronRight, BookOpen, GraduationCap, Lightbulb, Dumbbell } from 'lucide-react'
import type { EditableNodeResponse, EditableNodeUpdateRequest } from '../../types/api'
import { editableApi } from '../../api/editable'
import { SectionGroup } from './SectionGroup'
import { EditableField } from './EditableField'

const nodeTypeLabel: Record<string, string> = {
  module: 'Модуль',
  lesson: 'Урок',
  concept: 'Концепт',
  exercise: 'Вправа',
}

const nodeTypeIcon: Record<string, typeof BookOpen> = {
  module: BookOpen,
  lesson: GraduationCap,
  concept: Lightbulb,
  exercise: Dumbbell,
}

const nodeTypeColor: Record<string, string> = {
  module: 'text-navy bg-navy-pale',
  lesson: 'text-forest bg-forest-pale',
  concept: 'text-plum bg-plum-pale',
  exercise: 'text-amber bg-amber-pale',
}

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'short' | 'number' | 'list' | 'structured_list'
}

const formalFields: FieldDef[] = [
  { name: 'title', label: 'Назва', type: 'short' },
  { name: 'description', label: 'Опис', type: 'text' },
  { name: 'learning_goal', label: 'Мета навчання', type: 'text' },
  { name: 'expected_knowledge', label: 'Очікувані знання', type: 'structured_list' },
  { name: 'expected_skills', label: 'Очікувані навички', type: 'structured_list' },
  { name: 'prerequisites', label: 'Передумови', type: 'list' },
  { name: 'difficulty', label: 'Складність', type: 'short' },
  { name: 'estimated_duration', label: 'Тривалість (хв)', type: 'number' },
]

const resultFields: FieldDef[] = [
  { name: 'success_criteria', label: 'Критерії успіху', type: 'text' },
  { name: 'assessment_method', label: 'Метод оцінки', type: 'text' },
  { name: 'competencies', label: 'Компетенції', type: 'list' },
]

const methodFields: FieldDef[] = [
  { name: 'key_concepts', label: 'Ключові поняття', type: 'structured_list' },
  { name: 'common_mistakes', label: 'Типові помилки', type: 'list' },
  { name: 'teaching_strategy', label: 'Стратегія викладання', type: 'text' },
  { name: 'activities', label: 'Активності', type: 'list' },
]

const contextFields: FieldDef[] = [
  { name: 'teaching_style', label: 'Стиль викладання', type: 'text' },
  { name: 'deep_dive_references', label: 'Поглиблені джерела', type: 'structured_list' },
]

const referenceFields: FieldDef[] = [
  { name: 'timecodes', label: 'Таймкоди', type: 'structured_list' },
  { name: 'slide_references', label: 'Посилання на слайди', type: 'structured_list' },
  { name: 'web_references', label: 'Веб-посилання', type: 'structured_list' },
]

interface EditableNodeCardProps {
  node: EditableNodeResponse
  nodeId: string
  depth?: number
  onNodeUpdated: (updated: EditableNodeResponse) => void
}

export function EditableNodeCard({ node, nodeId, depth = 0, onNodeUpdated }: EditableNodeCardProps) {
  const [expanded, setExpanded] = useState(depth === 0)

  const Icon = nodeTypeIcon[node.node_type] || BookOpen
  const colorClass = nodeTypeColor[node.node_type] || 'text-ink bg-canvas-dark'

  const handleSave = useCallback(
    async (fieldName: string, value: unknown) => {
      const update: EditableNodeUpdateRequest = { [fieldName]: value }
      const updated = await editableApi.updateField(nodeId, node.id, update)
      onNodeUpdated(updated)
    },
    [nodeId, node.id, onNodeUpdated],
  )

  const renderSection = (title: string, fields: FieldDef[], defaultOpen = false) => {
    const hasContent = fields.some((f) => {
      const v = node[f.name as keyof EditableNodeResponse]
      return v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
    })

    return (
      <SectionGroup title={title} defaultOpen={defaultOpen || hasContent}>
        {fields.map((f) => (
          <EditableField
            key={f.name}
            label={f.label}
            fieldName={f.name}
            value={node[f.name as keyof EditableNodeResponse]}
            type={f.type}
            isEdited={node.edited_fields.includes(f.name)}
            onSave={handleSave}
          />
        ))}
      </SectionGroup>
    )
  }

  return (
    <div className={depth > 0 ? 'ml-4 border-l-2 border-canvas-dark/40 pl-3' : ''}>
      {/* Node header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 px-1 hover:bg-canvas-dark/20 rounded-lg transition-colors text-left"
      >
        <ChevronRight
          size={14}
          className={`text-ink-muted transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
        />
        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon size={13} />
        </div>
        <span className="text-sm font-medium text-ink truncate flex-1">{node.title}</span>
        <span className="text-[10px] text-ink-muted shrink-0">
          {nodeTypeLabel[node.node_type] || node.node_type}
        </span>
        {node.edited_fields.length > 0 && (
          <span className="text-[10px] bg-amber-pale text-amber rounded-full px-1.5 py-0.5 shrink-0">
            {node.edited_fields.length}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2 pb-3 pt-1">
          {renderSection('Формальне', formalFields, true)}
          {renderSection('Результати', resultFields)}
          {renderSection('Методологія', methodFields)}
          {renderSection('Контекст', contextFields)}
          {renderSection('Посилання', referenceFields)}

          {/* Recursive children */}
          {node.children.length > 0 && (
            <div className="mt-2 space-y-1">
              {node.children.map((child) => (
                <EditableNodeCard
                  key={child.id}
                  node={child}
                  nodeId={nodeId}
                  depth={depth + 1}
                  onNodeUpdated={onNodeUpdated}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
