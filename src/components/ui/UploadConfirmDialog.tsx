import { useEffect, useId, useMemo, useState } from 'react'
import { Modal } from './Modal'
import {
  CODE_ELIGIBLE_TEXT_EXTENSIONS,
  isVideoUrl,
} from '../../utils/uploadRouting'
import { isYamlFileName } from '../../utils/testDraft'
import type {
  AssignmentType,
  MaterialEstimateKind,
  MaterialRole,
  ProcessingEstimateRequest,
} from '../../types/api'
import { TASK_TYPE_OPTIONS, formatAudioDuration } from './uploadConfirmMeta'
import { estimateProcessing } from '../../api/billing'
import { useActionPrice, type PriceRequest } from '../../hooks/useActionPrice'
import { readMaterialFeatures } from '../../utils/materialFeatures'
import { isMaterialEstimateKind } from '../../utils/priceEstimate'
import { PriceCard } from '../billing/PriceCard'

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
//
// Test axis (task 07c): a YAML file with the «Тест» kind becomes a test
// written in the system — the server reads its questions and keeps no file,
// and its role is always educational (it does not read the one sent). Any
// other file or a link with that kind would be refused, so it is not sent.
//
// Price axis (BIL-E): with the node given, the processing of each file is
// priced before the send — one estimate per file, from what the browser reads
// of it (`materialFeatures`). Code and archives are prepared for free first
// (their processing starts after the roles are confirmed) and a YAML test is
// never processed: they have no line. "Not enough" for any file stops the
// whole batch; the purchase opens in a new tab and the price is asked again.

export interface UploadConfirmFile {
  name: string
  sourceType: string
  durationSec?: number | null
  /** The file itself: its features are read for the price. */
  file?: File
}

export interface UploadConfirmProps {
  open: boolean
  /** Keep it stable between renders: a new list is a new batch to price. */
  files: UploadConfirmFile[]
  linkUrl?: string
  /** The node the material goes to; without it no price is asked. */
  nodeId?: string
  onConfirm: (
    role: MaterialRole,
    taskType: AssignmentType | null,
    asCode: boolean,
  ) => void
  onCancel: () => void
}

const extOf = (name: string): string =>
  name.split('.').pop()?.toLowerCase() ?? ''

/** The kind a file is priced as when sent, or null when sending is not paid. */
function paidKind(
  file: UploadConfirmFile,
  asCode: boolean,
): MaterialEstimateKind | null {
  const type =
    asCode && CODE_ELIGIBLE_TEXT_EXTENSIONS.includes(extOf(file.name))
      ? 'code'
      : file.sourceType
  return type !== 'code' && isMaterialEstimateKind(type) ? type : null
}

/** The features of each file, read once per batch (null while reading). */
function useFileFeatures(
  files: UploadConfirmFile[],
  active: boolean,
): Map<UploadConfirmFile, ProcessingEstimateRequest> | null {
  const [found, setFound] = useState<{
    files: UploadConfirmFile[]
    features: Map<UploadConfirmFile, ProcessingEstimateRequest>
  } | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    void Promise.all(
      files.map(async (f) => {
        // An html file may be sent as code; as text it is read like any text.
        const kind = paidKind(f, false)
        const features: ProcessingEstimateRequest =
          kind === null
            ? { kind: 'code' }
            : f.file
              ? await readMaterialFeatures(f.file, kind, f.durationSec ?? null)
              : { kind }
        return [f, features] as const
      }),
    ).then((pairs) => {
      if (!cancelled) setFound({ files, features: new Map(pairs) })
    })
    return () => {
      cancelled = true
    }
  }, [files, active])

  return found && found.files === files ? found.features : null
}

export function UploadConfirmDialog({
  open,
  files,
  linkUrl,
  nodeId,
  onConfirm,
  onCancel,
}: UploadConfirmProps) {
  const [role, setRole] = useState<MaterialRole | null>(null)
  const [taskType, setTaskType] = useState<AssignmentType | null>(null)
  const [asCode, setAsCode] = useState(false)
  const hintId = useId()

  const pricing = open && nodeId !== undefined
  const features = useFileFeatures(files, pricing && !linkUrl)
  const requests = useMemo((): PriceRequest[] | null => {
    if (!pricing || nodeId === undefined) return []
    if (linkUrl) {
      // What a link holds is not read before it is added: the kind alone.
      const kind = isVideoUrl(linkUrl) ? 'video' : 'web'
      return [{ estimate: () => estimateProcessing(nodeId, { kind }) }]
    }
    if (features === null) return null
    return files.flatMap((f) => {
      const kind = paidKind(f, asCode)
      const request = features.get(f)
      if (kind === null || !request) return []
      return [{ estimate: () => estimateProcessing(nodeId, request) }]
    })
  }, [pricing, nodeId, linkUrl, features, files, asCode])
  const price = useActionPrice(requests)

  const reset = () => {
    setRole(null)
    setTaskType(null)
    setAsCode(false)
  }

  const isTest = taskType === 'test'
  const yamlOnly =
    !linkUrl && files.length > 0 && files.every((f) => isYamlFileName(f.name))
  const testFromYaml = isTest && yamlOnly
  const testRefused = isTest && !yamlOnly
  // Shown, not stored: the author's own pick comes back if they change the
  // kind again.
  const chosenRole: MaterialRole | null = testFromYaml ? 'educational' : role

  const handleConfirm = () => {
    if (chosenRole && !testRefused && price.ready) {
      onConfirm(chosenRole, taskType, asCode)
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

      <div className={`flex gap-3 ${testFromYaml ? 'mb-2' : 'mb-6'}`}>
        <button
          type="button"
          onClick={() => setRole('educational')}
          disabled={testFromYaml}
          aria-pressed={chosenRole === 'educational'}
          aria-describedby={testFromYaml ? `${hintId}-role` : undefined}
          className={`
            flex-1 rounded-xl border-2 p-4 text-center transition-all
            disabled:cursor-not-allowed
            ${chosenRole === 'educational'
              ? 'border-navy bg-navy/5 shadow-sm'
              : 'border-canvas-dark hover:border-navy/40'}
          `}
        >
          <span className="text-2xl block mb-1">📚</span>
          <span className="text-sm font-medium text-ink">Навчальний</span>
          <span className="text-[11px] text-ink-muted block mt-0.5">
            Доносить інформацію студенту
          </span>
        </button>
        <button
          type="button"
          onClick={() => setRole('methodological')}
          disabled={testFromYaml}
          aria-pressed={chosenRole === 'methodological'}
          aria-describedby={testFromYaml ? `${hintId}-role` : undefined}
          className={`
            flex-1 rounded-xl border-2 p-4 text-center transition-all
            disabled:cursor-not-allowed disabled:opacity-50
            ${chosenRole === 'methodological'
              ? 'border-plum bg-plum/5 shadow-sm'
              : 'border-canvas-dark hover:border-plum/40 disabled:hover:border-canvas-dark'}
          `}
        >
          <span className="text-2xl block mb-1">📋</span>
          <span className="text-sm font-medium text-ink">Методичний</span>
          <span className="text-[11px] text-ink-muted block mt-0.5">
            Декларує наміри курсу
          </span>
        </button>
      </div>
      {testFromYaml && (
        <p id={`${hintId}-role`} className="text-xs text-ink-muted mb-6">
          Тест завжди навчальний.
        </p>
      )}

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

      {/* One note at a time: the «Тест» kind decides how the file is read,
          so it replaces the code note. */}
      {testFromYaml ? (
        <div className="rounded-lg bg-navy/5 border border-navy/15 p-3 mb-4 text-[12px] text-ink-muted">
          Тест із файла YAML: питання, варіанти й позначки буде прочитано з
          файла, сам файл не зберігається. Студенти побачать тест лише після
          публікації; відкрити його можна кнопкою «Відкрити тест» у рядку
          матеріалу.
        </div>
      ) : testRefused ? (
        <div
          id={`${hintId}-refused`}
          className="rounded-lg bg-navy/5 border border-navy/15 p-3 mb-4 text-[12px] text-ink-muted"
        >
          Тест завантажується лише файлом YAML (.yaml чи .yml). Оберіть інший
          вид завдання або завантажте файл YAML.
        </div>
      ) : (
        codeActive && (
          <div className="rounded-lg bg-navy/5 border border-navy/15 p-3 mb-4 text-[12px] text-ink-muted">
            Код-матеріал: ваші власні файли увійдуть до уроку повністю. Типові й
            службові файли — залежності, стандартні бібліотеки, згенеровані й
            завеликі — залишаться лише згадкою в структурі проєкту.
          </div>
        )
      )}

      {pricing && (
        <div className="mb-4">
          <PriceCard price={price} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button className="btn-secondary btn-sm" onClick={handleCancel}>
          Скасувати
        </button>
        <button
          className="btn-primary btn-sm"
          onClick={handleConfirm}
          disabled={chosenRole === null || testRefused || !price.ready}
          aria-describedby={testRefused ? `${hintId}-refused` : undefined}
        >
          Завантажити
        </button>
      </div>
    </Modal>
  )
}
