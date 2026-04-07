import { useCallback, useState } from 'react'
import { useCourseStore } from '../../stores/course'
import { materialsApi } from '../../api/materials'
import { nodesApi } from '../../api/nodes'
import { StatusBadge } from '../ui/StatusBadge'
import { sourceTypeMeta } from '../../utils/sourceTypeIcon'
import {
  X,
  Upload,
  Trash2,
  RotateCcw,
  FileText,
  Video,
  FileImage,
  Globe,
  File as FileIcon,
  Loader2,
  Link2,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import type { NodeWithMaterials, MaterialEntrySummary, MaterialRole } from '../../types/api'

const iconMap: Record<string, typeof FileText> = {
  FileText, Video, FileImage, Globe, File: FileIcon,
}

function findNode(tree: NodeWithMaterials, id: string): NodeWithMaterials | null {
  if (tree.id === id) return tree
  for (const child of tree.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

export function NodeDetailPanel() {
  const tree = useCourseStore((s) => s.tree)
  const selectedNodeId = useCourseStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useCourseStore((s) => s.setSelectedNodeId)
  const setTree = useCourseStore((s) => s.setTree)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [linkUrl, setLinkUrl] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [materialRole, setMaterialRole] = useState<MaterialRole>('educational')

  const node = tree && selectedNodeId ? findNode(tree, selectedNodeId) : null

  const refresh = useCallback(async () => {
    if (!tree) return
    const fresh = await nodesApi.getDetail(tree.id)
    setTree(fresh)
  }, [tree, setTree])

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!node) return
      setUploading(true)
      setUploadProgress({ done: 0, total: files.length })
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        const type = ['mp4', 'mp3', 'wav', 'webm'].includes(ext)
          ? 'video'
          : ['pdf', 'pptx', 'ppt'].includes(ext)
            ? 'presentation'
            : ['html', 'htm'].includes(ext)
              ? 'web'
              : 'text'
        await materialsApi.upload(node.id, file, type, materialRole)
        setUploadProgress({ done: i + 1, total: files.length })
      }
      await refresh()
      setUploading(false)
    },
    [node, refresh, materialRole],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'video/*': ['.mp4', '.mp3', '.wav', '.webm'],
      'text/*': ['.txt', '.html', '.htm', '.md'],
    },
  })

  const handleDelete = useCallback(
    async (mat: MaterialEntrySummary) => {
      if (!confirm(`Видалити «${mat.filename || mat.source_url || mat.source_type}»?`)) return
      await materialsApi.delete(mat.id)
      await refresh()
    },
    [refresh],
  )

  const handleRetry = useCallback(
    async (mat: MaterialEntrySummary) => {
      await materialsApi.retry(mat.id)
      await refresh()
    },
    [refresh],
  )

  const handleAddLink = useCallback(async () => {
    if (!node || !linkUrl.trim()) return
    setAddingLink(true)
    try {
      const url = linkUrl.trim()
      const isVideo = /youtu\.?be|vimeo|\.mp4/i.test(url)
      await materialsApi.uploadUrl(node.id, url, isVideo ? 'video' : 'web', materialRole)
      setLinkUrl('')
      await refresh()
    } finally {
      setAddingLink(false)
    }
  }, [node, linkUrl, refresh, materialRole])

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
                  accept=".pdf,.pptx,.mp4,.mp3,.wav,.webm,.txt,.html,.htm,.md"
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

        {/* Material role toggle */}
        <div className="mt-3 flex rounded-lg border border-canvas-dark/40 overflow-hidden">
          <button
            onClick={() => setMaterialRole('educational')}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              materialRole === 'educational'
                ? 'bg-navy text-white'
                : 'bg-white text-ink-muted hover:bg-canvas'
            }`}
          >
            📚 Учбовий
          </button>
          <button
            onClick={() => setMaterialRole('methodological')}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              materialRole === 'methodological'
                ? 'bg-plum text-white'
                : 'bg-white text-ink-muted hover:bg-canvas'
            }`}
          >
            📋 Методичний
          </button>
        </div>

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
        {node.materials.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-8">
            Матеріали ще не завантажені
          </p>
        ) : (
          node.materials.map((mat) => {
            const meta = sourceTypeMeta(mat.source_type)
            const Icon = iconMap[meta.icon] || FileIcon
            return (
              <div
                key={mat.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-canvas hover:bg-canvas-dark/50
                           transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={meta.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {mat.filename || mat.source_url || mat.source_type}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StatusBadge state={mat.state} />
                    {mat.material_role === 'methodological' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-plum/10 text-plum font-medium">
                        методичний
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {mat.state === 'error' && (
                    <button
                      onClick={() => handleRetry(mat)}
                      className="p-1.5 rounded-lg hover:bg-amber-pale transition-colors"
                      title="Повторити обробку"
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
    </div>
  )
}
