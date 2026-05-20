import { useCallback, useState } from 'react'
import { useCourseStore } from '../../stores/course'
import { documentsApi } from '../../api/documents'
import { nodesApi } from '../../api/nodes'
import { ApiError } from '../../api/client'
import { StatusBadge } from '../ui/StatusBadge'
import { Modal } from '../ui/Modal'
import { sourceTypeMeta } from '../../utils/sourceTypeIcon'
import { rejectionDetail } from '../../utils/apiError'
import {
  X,
  Upload,
  Trash2,
  RotateCcw,
  FileText,
  Video,
  FileImage,
  Globe,
  AudioLines,
  File as FileIcon,
  Loader2,
  Link2,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import type {
  AssignmentType,
  NodeWithDocuments,
  AuthoredDocumentSummary,
  MaterialRole,
} from '../../types/api'

const TASK_TYPE_OPTIONS: { value: AssignmentType; label: string; hint: string }[] = [
  { value: 'test', label: 'Тест', hint: '5–10 хв, quiz' },
  { value: 'short_task', label: 'Коротке завдання', hint: '20–60 хв' },
  { value: 'task', label: 'Завдання', hint: 'мульти-крок' },
  { value: 'project', label: 'Проєкт', hint: '1–2 тижні' },
]

const iconMap: Record<string, typeof FileText> = {
  FileText, Video, FileImage, Globe, AudioLines, File: FileIcon,
}

// Phase 2.2 UI sub-area item #2/#3 — audio duration preview + hybrid hard-reject.
// Backend authoritative reject lands у AudioProcessor.process_raw (PR #420).
const MAX_AUDIO_DURATION_SEC = 150 * 60
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac'])

function isAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return AUDIO_EXTENSIONS.has(ext)
}

function formatAudioDuration(seconds: number): string {
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `[${h}:${pad(m)}:${pad(s)}]` : `[${pad(m)}:${pad(s)}]`
}

// Reads audio file duration via HTMLAudioElement loadedmetadata event.
// Returns seconds or null when browser cannot determine duration (VBR
// MP3 / damaged headers → Infinity / NaN / error). Null signals
// fail-open path — upload proceeds, backend reject у worker per PR #420.
function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audioEl = document.createElement('audio')
    audioEl.preload = 'metadata'
    let settled = false
    const cleanup = () => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      audioEl.removeEventListener('loadedmetadata', onLoad)
      audioEl.removeEventListener('error', onError)
      clearTimeout(timer)
    }
    const onLoad = () => {
      const d = audioEl.duration
      const valid = Number.isFinite(d) && d > 0
      cleanup()
      resolve(valid ? d : null)
    }
    const onError = () => {
      cleanup()
      resolve(null)
    }
    // Safety timeout for browsers that fire neither event on bad media.
    const timer = setTimeout(() => {
      cleanup()
      resolve(null)
    }, 5000)
    audioEl.addEventListener('loadedmetadata', onLoad)
    audioEl.addEventListener('error', onError)
    audioEl.src = url
  })
}

function findNode(tree: NodeWithDocuments, id: string): NodeWithDocuments | null {
  if (tree.id === id) return tree
  for (const child of tree.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

/* ── Upload confirmation dialog ── */

interface UploadConfirmProps {
  open: boolean
  files: { name: string; sourceType: string; durationSec?: number | null }[]
  linkUrl?: string
  onConfirm: (role: MaterialRole, taskType: AssignmentType | null) => void
  onCancel: () => void
}

function UploadConfirmDialog({ open, files, linkUrl, onConfirm, onCancel }: UploadConfirmProps) {
  const [role, setRole] = useState<MaterialRole | null>(null)
  const [taskType, setTaskType] = useState<AssignmentType | null>(null)

  const handleConfirm = () => {
    if (role) {
      onConfirm(role, taskType)
      setRole(null)
      setTaskType(null)
    }
  }
  const handleCancel = () => {
    setRole(null)
    setTaskType(null)
    onCancel()
  }

  const single = files.length === 1 ? files[0]! : null
  const label = linkUrl
    ? linkUrl.slice(0, 50) + (linkUrl.length > 50 ? '…' : '')
    : single
      ? `${single.name}${single.durationSec != null ? ` ${formatAudioDuration(single.durationSec)}` : ''}`
      : `${files.length} файлів`

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
          Якщо документ — це концретне завдання, оберіть тип:
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

/* ── Main panel ── */

export function NodeDetailPanel() {
  const tree = useCourseStore((s) => s.tree)
  const selectedNodeId = useCourseStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useCourseStore((s) => s.setSelectedNodeId)
  const setTree = useCourseStore((s) => s.setTree)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [linkUrl, setLinkUrl] = useState('')
  const [addingLink, setAddingLink] = useState(false)

  // Upload confirmation state
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingFileDurations, setPendingFileDurations] = useState<
    Map<string, number | null>
  >(new Map())
  const [pendingLink, setPendingLink] = useState<string | null>(null)
  const showConfirm = pendingFiles.length > 0 || pendingLink !== null

  const node = tree && selectedNodeId ? findNode(tree, selectedNodeId) : null

  const refresh = useCallback(async () => {
    if (!tree) return
    const fresh = await nodesApi.getDetail(tree.id)
    setTree(fresh)
  }, [tree, setTree])

  // File drop → audio duration check (Phase 2.2 UI item #2/#3) → confirmation.
  // Audio files with valid metadata + duration > 150 min are rejected
  // client-side. Files with Infinity/NaN duration proceed (fail-open;
  // backend AudioProcessor.process_raw catches via PR #420).
  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const accepted: File[] = []
    const durations = new Map<string, number | null>()
    const rejected: string[] = []
    const oversized: string[] = []

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      // Phase 2.3 Item #3 — client-side SIZE pre-check for presentations.
      // 50 MB inlined; backend AUTHORED_POLICY.max_presentation_size_bytes is
      // the source of truth (UI mirrors). FORBIDDEN_TYPE / SLIDE_COUNT_LIMIT
      // stay server-authoritative via the sync-400 catch path.
      if (['pdf', 'pptx', 'ppt'].includes(ext) && file.size > 50 * 1024 * 1024) {
        oversized.push(`${file.name} перевищує ліміт 50 МБ для презентацій`)
        continue
      }
      if (!isAudioFile(file)) {
        accepted.push(file)
        continue
      }
      const duration = await readAudioDuration(file)
      durations.set(file.name, duration)
      if (duration !== null && duration > MAX_AUDIO_DURATION_SEC) {
        rejected.push(`«${file.name}» — ${formatAudioDuration(duration)}`)
        continue
      }
      accepted.push(file)
    }

    if (rejected.length > 0) {
      alert(
        'Система зараз обробляє аудіо до 150 хвилин. ' +
          'Будь ласка, розділіть на коротші частини:\n\n' +
          rejected.join('\n'),
      )
    }

    if (oversized.length > 0) {
      alert(oversized.join('\n'))
    }

    if (accepted.length > 0) {
      setPendingFiles(accepted)
      setPendingFileDurations(durations)
    }
  }, [])

  // Link add → show confirmation
  const handleAddLink = useCallback(() => {
    if (!linkUrl.trim()) return
    setPendingLink(linkUrl.trim())
  }, [linkUrl])

  // Confirmed upload with role and optional task_type
  const handleConfirmUpload = useCallback(
    async (role: MaterialRole, taskType: AssignmentType | null) => {
      if (!node) return

      // Capture and clear immediately to close the dialog and prevent re-submission
      const filesToUpload = [...pendingFiles]
      const linkToUpload = pendingLink
      setPendingFiles([])
      setPendingFileDurations(new Map())
      setPendingLink(null)

      if (filesToUpload.length > 0) {
        setUploading(true)
        setUploadProgress({ done: 0, total: filesToUpload.length })
        const rejected: string[] = []
        try {
          for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i]!
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            const type = ['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)
              ? 'audio'
              : ['mp4', 'webm'].includes(ext)
                ? 'video'
                : ['pdf', 'pptx', 'ppt'].includes(ext)
                  ? 'presentation'
                  : ['html', 'htm'].includes(ext)
                    ? 'web'
                    : 'text'
            try {
              await documentsApi.upload(node.id, file, type, role, null, taskType)
            } catch (err) {
              rejected.push(
                rejectionDetail(err) ??
                  `${file.name}: помилка завантаження (${err instanceof ApiError ? err.status : 'unknown'})`,
              )
            }
            setUploadProgress({ done: i + 1, total: filesToUpload.length })
          }
        } finally {
          await refresh()
          setUploading(false)
        }
        if (rejected.length) alert(rejected.join('\n'))
      }

      if (linkToUpload) {
        setAddingLink(true)
        try {
          const isVideo = /youtu\.?be|vimeo|\.mp4/i.test(linkToUpload)
          await documentsApi.uploadUrl(
            node.id,
            linkToUpload,
            isVideo ? 'video' : 'web',
            role,
            null,
            taskType,
          )
          setLinkUrl('')
          await refresh()
        } finally {
          setAddingLink(false)
        }
      }
    },
    [node, pendingFiles, pendingLink, refresh],
  )

  const handleCancelUpload = useCallback(() => {
    setPendingFiles([])
    setPendingFileDurations(new Map())
    setPendingLink(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'video/*': ['.mp4', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'],
      'text/*': ['.txt', '.html', '.htm', '.md'],
    },
  })

  const handleDelete = useCallback(
    async (mat: AuthoredDocumentSummary) => {
      if (!confirm(`Видалити «${mat.filename || mat.source_url || mat.source_type}»?`)) return
      await documentsApi.delete(mat.id)
      await refresh()
    },
    [refresh],
  )

  const handleRetry = useCallback(
    async (mat: AuthoredDocumentSummary) => {
      // `force=true` is required to reprocess a material that already
      // reached `ready` (e.g. after changing the course/material language).
      // For error-state materials, force is harmless and still works.
      const force = mat.state !== 'error'
      if (
        force &&
        !confirm(
          `Перезапустити обробку «${mat.filename || mat.source_url || mat.source_type}»? ` +
            'Поточний результат буде замінено новим.',
        )
      ) {
        return
      }
      await documentsApi.retry(mat.id, force)
      await refresh()
    },
    [refresh],
  )

  // Toggle material role on existing material (clickable badge)
  const handleToggleRole = useCallback(
    async (mat: AuthoredDocumentSummary) => {
      const newRole: MaterialRole = mat.material_role === 'educational' ? 'methodological' : 'educational'
      try {
        await documentsApi.update(mat.id, { material_role: newRole })
        await refresh()
      } catch {
        // Silently fail — API might not support this yet
      }
    },
    [refresh],
  )

  if (!node) return null

  return (
    <div className="w-[380px] bg-white border-l border-canvas-dark/40 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-canvas-dark/30 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-ink truncate">{node.title}</h3>
          {node.description && (
            <p className="text-ink-muted text-sm mt-1 line-clamp-2">{node.description}</p>
          )}
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="p-1.5 rounded-lg hover:bg-canvas-dark transition-colors shrink-0 ml-2"
        >
          <X size={16} className="text-ink-muted" />
        </button>
      </div>

      {/* Upload zone */}
      <div className="p-4 border-b border-canvas-dark/30">
        {uploading ? (
          <div className="border-2 border-dashed border-navy/30 bg-navy-pale rounded-xl p-4">
            <Loader2 size={20} className="mx-auto mb-2 text-navy animate-spin" />
            <p className="text-sm text-navy text-center font-medium">
              Завантаження {uploadProgress.done}/{uploadProgress.total}
            </p>
            <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-navy rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.total ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-4 text-center transition-colors relative
              ${isDragActive ? 'border-navy bg-navy-pale' : 'border-canvas-dark'}
            `}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <>
                <Upload size={20} className="mx-auto mb-2 text-navy" />
                <p className="text-sm text-navy font-medium">Відпустіть файли тут</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={20} className="text-ink-muted" />
                <span className="text-sm text-ink-muted">Перетягніть файли сюди</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.pptx,.ppt,.mp4,.webm,.mp3,.wav,.m4a,.ogg,.flac,.txt,.html,.htm,.md"
                  className="text-sm text-ink-muted file:mr-2 file:py-1 file:px-3 file:rounded-lg
                             file:border-0 file:text-sm file:font-medium file:bg-navy file:text-white
                             file:cursor-pointer cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files) {
                      onDrop(Array.from(e.target.files))
                      e.target.value = ''
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* URL input */}
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="url"
              className="input pl-8 text-sm"
              placeholder="https://youtu.be/... або URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              disabled={addingLink}
            />
          </div>
          <button
            className="btn-primary btn-sm shrink-0"
            onClick={handleAddLink}
            disabled={addingLink || !linkUrl.trim()}
          >
            {addingLink ? <Loader2 size={14} className="animate-spin" /> : 'Додати'}
          </button>
        </div>
      </div>

      {/* Materials list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {node.authored_documents.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-8">
            Документи ще не завантажені
          </p>
        ) : (
          node.authored_documents.map((mat) => {
            const meta = sourceTypeMeta(mat.source_type)
            const Icon = iconMap[meta.icon] || FileIcon
            const isMethodological = mat.material_role === 'methodological'
            return (
              <div
                key={mat.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-canvas hover:bg-canvas-dark/50
                           transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <Icon size={16} className={meta.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {mat.filename || mat.source_url || mat.source_type}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge state={mat.state} />
                    <button
                      onClick={() => handleToggleRole(mat)}
                      className={`
                        text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer
                        transition-colors
                        ${isMethodological
                          ? 'bg-plum/10 text-plum hover:bg-plum/20'
                          : 'bg-navy/6 text-ink-muted hover:bg-navy/12'}
                      `}
                      title="Натисніть щоб змінити тип"
                    >
                      {isMethodological ? '📋 методичний' : '📚 учбовий'}
                    </button>
                  </div>
                  {mat.state === 'error' && mat.error_message && (
                    <p className="text-xs text-coral mt-1 line-clamp-2">
                      {mat.error_message}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {(mat.state === 'error' || mat.state === 'ready') && (
                    <button
                      onClick={() => handleRetry(mat)}
                      className="p-1.5 rounded-lg hover:bg-amber-pale transition-colors"
                      title={
                        mat.state === 'error'
                          ? 'Повторити обробку'
                          : 'Перезапустити обробку (force)'
                      }
                    >
                      <RotateCcw size={14} className="text-amber" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(mat)}
                    className="p-1.5 rounded-lg hover:bg-coral-pale transition-colors"
                    title="Видалити"
                  >
                    <Trash2 size={14} className="text-coral" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Upload confirmation dialog */}
      <UploadConfirmDialog
        open={showConfirm}
        files={pendingFiles.map((f) => ({
          name: f.name,
          sourceType: '',
          durationSec: pendingFileDurations.get(f.name) ?? null,
        }))}
        linkUrl={pendingLink || undefined}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />
    </div>
  )
}
