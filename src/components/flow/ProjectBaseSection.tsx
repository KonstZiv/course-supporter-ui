import { useCallback, useEffect, useRef, useState } from 'react'
import { FileArchive, Upload, AlertTriangle, ListTree } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { ApiError } from '../../api/client'
import { usePolling } from '../../hooks/usePolling'
import { useWorkListStore } from '../../stores/workList'
import { Modal } from '../ui/Modal'
import type { UploadProgress } from '../../api/upload'
import type { UploadBatchState } from '../../hooks/useUploadBatch'
import { UploadProgressView } from '../activity/UploadProgressView'
import type {
  ProjectBaseManifest,
  ProjectBaseStateResponse,
} from '../../types/api'
import { ProjectBaseBadge } from './ProjectBaseBadge'
import { BaseManifestView } from './BaseManifestView'
import { baseErrorMessage } from './baseErrors'
import { useLanguage, useT } from '../../i18n/LanguageContext'

const POLL_INTERVAL_MS = 4000
const ACCEPT = '.zip,.tar.gz,.tgz,.gz'

// Re-upload warning (ratified task.md decision, not polish): a new version does
// NOT retroactively re-bind existing submissions — they stay diffed against the
// version they were submitted against. Staleness is a signal to the student,
// not a breakage.

/**
 * Author-side project-base panel for a single ``task_type='project'`` document.
 *
 * Four DISTINCT renders, never collapsed: no-base (attach slot) ≠ pending
 * (badge + local poller) ≠ ready (badge + manifest affordance lands in C4 +
 * re-upload) ≠ failed (badge + failure_reason + re-upload). Owns its own base
 * state + poller locally — the base is not part of the course-store tree.
 */
export function ProjectBaseSection({ documentId }: { documentId: string }) {
  const language = useLanguage()
  const t = useT()
  const [base, setBase] = useState<ProjectBaseStateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadBytes, setUploadBytes] = useState<UploadProgress | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const requestRefresh = useWorkListStore((s) => s.requestRefresh)

  // Manifest modal (fetched lazily on open — the route is READY-only).
  const [manifestOpen, setManifestOpen] = useState(false)
  const [manifest, setManifest] = useState<ProjectBaseManifest | null>(null)
  const [manifestError, setManifestError] = useState('')

  // Initial state fetch. 404 = NO_BASE_ATTACHED → no base yet (attach slot),
  // a control-flow signal distinct from any normalization state.
  const load = useCallback(async () => {
    try {
      setBase(await documentsApi.getBaseState(documentId))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setBase(null)
      } else {
        setError(t('panel.flow.projectBase.loadStateFailed'))
      }
    } finally {
      setLoading(false)
    }
  }, [documentId, t])

  useEffect(() => {
    void load()
  }, [load])

  // Local poller — mirrors useDocumentStatePolling: while pending, re-fetch
  // every 4s until the base settles to ready | failed.
  const tick = useCallback(async (): Promise<boolean> => {
    const s = await documentsApi.getBaseState(documentId)
    setBase(s)
    return s.state !== 'pending'
  }, [documentId])
  usePolling(tick, POLL_INTERVAL_MS, base?.state === 'pending')

  const pickFile = () => fileRef.current?.click()

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // allow re-picking the same filename
      if (!file) return
      setError('')
      setUploading(true)
      setUploadBytes(null)
      try {
        // Е2 — same send primitive and byte display as the file surfaces; the
        // base's own state axis (below) is untouched.
        const res = await documentsApi.attachBase(documentId, file, (p) =>
          setUploadBytes(p),
        )
        // Optimistic: the attach response is the fresh pending version; the
        // poller (enabled by state='pending') drives it to ready | failed.
        setBase({
          version: res.version,
          state: res.state,
          failure_reason: null,
          snapshot_hash: null,
        })
        setManifest(null) // the previous version's manifest is now stale
        // Е9/pkt 2 — a base_normalize job enters the work-list; wake the strip.
        requestRefresh()
      } catch (err) {
        setError(baseErrorMessage(language, err))
      } finally {
        setUploading(false)
        setUploadBytes(null)
      }
    },
    [documentId, requestRefresh, language],
  )

  const openManifest = useCallback(async () => {
    setManifestOpen(true)
    if (manifest) return // already fetched for this base version
    setManifestError('')
    try {
      setManifest(await documentsApi.getBaseManifest(documentId))
    } catch {
      setManifestError(t('panel.flow.projectBase.loadManifestFailed'))
    }
  }, [documentId, manifest, t])

  const busy = uploading || base?.state === 'pending'

  // The base upload reuses the shared byte display (Е6/Е5); a single file, so no
  // file counter (count = 1).
  const uploadView: UploadBatchState | null = uploading
    ? {
        active: true,
        index: 1,
        count: 1,
        bytes: uploadBytes,
        awaitingServer:
          uploadBytes !== null &&
          uploadBytes.total > 0 &&
          uploadBytes.loaded >= uploadBytes.total,
      }
    : null

  return (
    <div className="text-sm">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={onFile}
      />

      {uploadView && (
        <div className="mb-1.5">
          <UploadProgressView state={uploadView} />
        </div>
      )}

      {loading ? (
        <p className="text-ink-muted text-xs">{t('panel.flow.projectBase.loadingState')}</p>
      ) : base === null ? (
        /* No base attached — a valid state (submissions diff as all-new). */
        <div className="flex items-center gap-2 flex-wrap">
          <FileArchive size={14} className="text-ink-muted shrink-0" />
          <span className="text-ink-muted text-xs">{t('panel.flow.projectBase.noBaseAttached')}</span>
          <button
            onClick={pickFile}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                       bg-plum/10 text-plum hover:bg-plum/20 transition-colors
                       disabled:opacity-50 cursor-pointer"
          >
            <Upload size={12} />
            {uploading ? t('panel.flow.projectBase.uploading') : t('panel.flow.projectBase.attachBase')}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <FileArchive size={14} className="text-ink-muted shrink-0" />
            <span className="text-ink font-medium">
              {t('panel.flow.projectBase.version', { version: base.version })}
            </span>
            <ProjectBaseBadge state={base.state} />
            {base.state === 'ready' && (
              <button
                onClick={openManifest}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                           bg-navy/6 text-ink-muted hover:bg-navy/12 transition-colors
                           cursor-pointer"
                title={t('panel.flow.projectBase.viewManifestHint')}
              >
                <ListTree size={12} />
                {t('panel.flow.projectBase.manifestButton')}
              </button>
            )}
            {(base.state === 'ready' || base.state === 'failed') && (
              <button
                onClick={pickFile}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg
                           bg-navy/6 text-ink-muted hover:bg-navy/12 transition-colors
                           disabled:opacity-50 cursor-pointer"
                title={t('panel.flow.projectBase.uploadNewVersionHint')}
              >
                <Upload size={12} />
                {uploading ? t('panel.flow.projectBase.uploading') : t('panel.flow.projectBase.reuploadButton')}
              </button>
            )}
          </div>

          {base.state === 'failed' && base.failure_reason && (
            <p className="text-xs text-coral flex items-start gap-1">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{base.failure_reason}</span>
            </p>
          )}

          {(base.state === 'ready' || base.state === 'failed') && (
            <p className="text-[11px] text-ink-muted leading-snug">
              {t('panel.flow.projectBase.reuploadWarning')}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-coral mt-1">{error}</p>}

      <Modal
        open={manifestOpen}
        onClose={() => setManifestOpen(false)}
        title={t('panel.flow.projectBase.manifestModalTitle', { version: base?.version ?? '' })}
        wide
      >
        {manifestError ? (
          <p className="text-sm text-coral">{manifestError}</p>
        ) : manifest ? (
          <BaseManifestView manifest={manifest} />
        ) : (
          <p className="text-sm text-ink-muted">{t('panel.flow.projectBase.loadingManifest')}</p>
        )}
      </Modal>
    </div>
  )
}
