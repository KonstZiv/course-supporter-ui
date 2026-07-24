import { useState } from 'react'
import { Modal } from './Modal'
import { CODE_ELIGIBLE_TEXT_EXTENSIONS } from '../../utils/uploadRouting'
import type { AssignmentType, MaterialRole } from '../../types/api'
import { TASK_TYPE_OPTIONS, formatAudioDuration } from './uploadConfirmMeta'

// «Тип документа» — the pre-upload classification dialog (defect #10 +
// task-code-materials R6). Extracted from NodeDetailPanel to components/ui/
// so BOTH upload paths — the side-zone drop area AND the canvas context
// menu — run the same dialog: the role feeds content_kind routing, the task
// type feeds the homework contour, and the code axis (below) is author
// intent that cannot be derived from the extension.
//
// Code axis (R6/defect #9): files whose extension already routes to
// source_type=code (py/zip/…) surface an informational region; html/htm
// files additionally get an explicit «Це код» toggle — an .html lesson has
// two legitimate readings (article → prose extraction vs code example →
// taken verbatim), distinguishable only by the author. The description-only
// note mirrors the backend typicality contract (F2/F7): typical/library
// files and files over 4 MiB enter the material as description only.

export interface UploadConfirmFile {
  name: string
  sourceType: string
  durationSec?: number | null
}

export interface UploadConfirmProps {
  open: boolean
  files: UploadConfirmFile[]
  linkUrl?: string
  onConfirm: (
    role: MaterialRole,
    taskType: AssignmentType | null,
    asCode: boolean,
  ) => void
  onCancel: () => void
}

const extOf = (name: string): string =>
  name.split('.').pop()?.toLowerCase() ?? ''

export function UploadConfirmDialog({
  open,
  files,
  linkUrl,
  onConfirm,
  onCancel,
}: UploadConfirmProps) {
  const [role, setRole] = useState<MaterialRole | null>(null)
  const [taskType, setTaskType] = useState<AssignmentType | null>(null)
  const [asCode, setAsCode] = useState(false)

  const reset = () => {
    setRole(null)
    setTaskType(null)
    setAsCode(false)
  }
  const handleConfirm = () => {
    if (role) {
      onConfirm(role, taskType, asCode)
      reset()
    }
  }
  const handleCancel = () => {
    reset()
    onCancel()
  }

  const single = files.length === 1 ? files[0]! : null
  const label = linkUrl
    ? linkUrl.slice(0, 50) + (linkUrl.length > 50 ? '…' : '')
    : single
      ? `${single.name}${single.durationSec != null ? ` ${formatAudioDuration(single.durationSec)}` : ''}`
      : `${files.length} файлів`

  // Code axis surfaces (files only — a link is never code).
  const routedCode = !linkUrl && files.some((f) => f.sourceType === 'code')
  const codeEligible =
    !linkUrl &&
    files.some((f) => CODE_ELIGIBLE_TEXT_EXTENSIONS.includes(extOf(f.name)))
  const codeActive = routedCode || asCode

  return (
    <Modal open={open} onClose={handleCancel} title="Тип документа">
      <p className="text-sm text-ink-muted mb-1">
        Завантаження: <span className="font-medium text-ink">{label}</span>
      </p>
      <p className="text-sm text-ink-muted mb-4">
        Оберіть тип документа перед завантаженням:
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setRole('educational')}
          className={`
            flex-1 rounded-xl border-2 p-4 text-center transition-all
            ${role === 'educational'
              ? 'border-navy bg-navy/5 shadow-sm'
              : 'border-canvas-dark hover:border-navy/40'}
          `}
        >
          <span className="text-2xl block mb-1">📚</span>
          <span className="text-sm font-medium text-ink">Учбовий</span>
          <span className="text-[11px] text-ink-muted block mt-0.5">
            Доносить інформацію студенту
          </span>
        </button>
        <button
          onClick={() => setRole('methodological')}
          className={`
            flex-1 rounded-xl border-2 p-4 text-center transition-all
            ${role === 'methodological'
              ? 'border-plum bg-plum/5 shadow-sm'
              : 'border-canvas-dark hover:border-plum/40'}
          `}
        >
          <span className="text-2xl block mb-1">📋</span>
          <span className="text-sm font-medium text-ink">Методичний</span>
          <span className="text-[11px] text-ink-muted block mt-0.5">
            Декларує наміри курсу
          </span>
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-ink-muted mb-2">
          Якщо документ — це конкретне завдання, оберіть тип:
        </p>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setTaskType(null)}
            className={`
              rounded-lg border p-2 text-xs transition-all
              ${taskType === null
                ? 'border-navy bg-navy/5 text-ink font-medium'
                : 'border-canvas-dark text-ink-muted hover:border-navy/40'}
            `}
          >
            Не завдання
          </button>
          {TASK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTaskType(opt.value)}
              title={opt.hint}
              className={`
                rounded-lg border p-2 text-xs transition-all
                ${taskType === opt.value
                  ? 'border-plum bg-plum/5 text-ink font-medium'
                  : 'border-canvas-dark text-ink-muted hover:border-plum/40'}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {codeEligible && (
        <label className="flex items-start gap-2 mb-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={asCode}
            onChange={(e) => setAsCode(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm text-ink">
            Це код-матеріал
            <span className="block text-[11px] text-ink-muted">
              HTML-файл буде взято дослівно як приклад коду, без витягання
              прози (стаття ↔ код розрізняється лише вашим наміром).
            </span>
          </span>
        </label>
      )}

      {codeActive && (
        <div className="rounded-lg bg-navy/5 border border-navy/15 p-3 mb-4 text-[12px] text-ink-muted">
          Код-матеріал: ваші власні файли увійдуть до уроку повністю. Типові й
          службові файли — залежності, стандартні бібліотеки, згенеровані й
          завеликі — залишаться лише згадкою в структурі проєкту. Після обробки
          ви зможете уточнити роль кожного файла.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button className="btn-secondary btn-sm" onClick={handleCancel}>
          Скасувати
        </button>
        <button
          className="btn-primary btn-sm"
          onClick={handleConfirm}
          disabled={role === null}
        >
          Завантажити
        </button>
      </div>
    </Modal>
  )
}
