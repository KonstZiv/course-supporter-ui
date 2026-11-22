import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCourseStore } from '../../stores/course'
import { useWorkListStore } from '../../stores/workList'
import { documentsApi } from '../../api/documents'
import { nodesApi } from '../../api/nodes'
import { StatusBadge } from '../ui/StatusBadge'
import { Chip } from '../testEditor/Chip'
import { testStateChips } from '../../utils/stateVocabulary'
import { MaterialProgressDetail } from './MaterialProgressDetail'
import { UploadProgressView } from '../activity/UploadProgressView'
import { UploadFailuresView } from '../activity/UploadFailuresView'
import { ContactAdmin } from '../ui/ContactAdmin'
import { DocumentStructureBlock } from './DocumentStructureBlock'
import { UploadConfirmDialog } from '../ui/UploadConfirmDialog'
import { ProjectBaseSection } from './ProjectBaseSection'
import { sourceTypeMeta } from '../../utils/sourceTypeIcon'
import { documentLabel } from '../../utils/documentLabel'
import { newTestPath, testEditorPath } from '../../utils/testAddress'
import { authoredRejectionMessage } from '../../utils/apiError'
import { validateUploadFiles } from '../../utils/uploadValidation'
import { useUploadBatch, type UploadTask } from '../../hooks/useUploadBatch'
import { ingestErrorMessage } from '../../utils/ingestErrors'
import {
  buyUnitsText,
  INSUFFICIENT_UNITS_CATEGORY,
} from '../../utils/authorBillingTexts'
import { NewTabLink } from '../billing/NewTabLink'
import { Modal } from '../ui/Modal'
import { estimateKindOf, kindOnlyPriceLine } from '../../utils/kindOnlyPrice'
import { pricePendingText } from '../../utils/priceEstimate'
import { useLanguage, useT } from '../../i18n/LanguageContext'
import type { MessageKey, MessageValues } from '../../i18n/translate'
import {
  CODE_ELIGIBLE_TEXT_EXTENSIONS,
  sourceTypeForExtension,
  isVideoUrl,
  UPLOAD_DROPZONE_ACCEPT,
  UPLOAD_ACCEPT_ATTR,
} from '../../utils/uploadRouting'
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
  ListChecks,
  Loader2,
  Link2,
  AlertCircle,
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { findNode } from '../../utils/tree'
import type {
  AssignmentType,
  AuthoredDocumentSummary,
  MaterialRole,
} from '../../types/api'

const iconMap: Record<string, typeof FileText> = {
  FileText, Video, FileImage, Globe, AudioLines, ListChecks, File: FileIcon,
}

/* ── Main panel ── */

interface NodeDetailPanelProps {
  // Lifts the "open the Final review/edit modal" signal to the page, where
  // the wide modal mounts (Ratified #1 / #2). The modal itself lands in c3 —
  // this commit only surfaces the affordance and drives the open-state.
  // Carries the CourseNode title (NodeWithDocuments.title) so the modal
  // header can identify the node — NOT the Final's methodist title (often
  // empty/draft); the edit-view payload does not carry the node title.
  onOpenSummary?: (nodeId: string, nodeTitle: string) => void
}

/** The question before a material's processing is started again. */
function retryQuestion(
  t: (key: MessageKey, values?: MessageValues) => string,
  mat: AuthoredDocumentSummary,
  force: boolean,
): string {
  const name = documentLabel(mat)
  return force
    ? t('panel.flow.detail.retryForceQuestion', { name })
    : t('panel.flow.detail.retryQuestion', { name })
}

export function NodeDetailPanel({ onOpenSummary }: NodeDetailPanelProps = {}) {
  const language = useLanguage()
  const t = useT()
  const tree = useCourseStore((s) => s.tree)
  const selectedNodeId = useCourseStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useCourseStore((s) => s.setSelectedNodeId)
  const setTree = useCourseStore((s) => s.setTree)
  // Д1: progress detail reads the shared work-list store — no own poll. ``now``
  // refreshes each store update (the shell poll), so the duration advances with
  // the poll cycle, never a separate browser clock (Д4).
  const workItems = useWorkListStore((s) => s.items)
  // Д10 — every action that enqueues work (upload, link, retry) wakes the shell
  // poll, not just node-summary generation: a short ingest (~10 s) finishes
  // before the idle 60 s cadence would notice it, so without this the strip and
  // card would miss the author's most frequent action entirely (live acceptance
  // 2026-08-13).
  const requestRefresh = useWorkListStore((s) => s.requestRefresh)
  const now = Date.now()
  const navigate = useNavigate()
  const {
    state: uploadState,
    run: runUpload,
    failures: uploadFailures,
    reportFailures,
    dismissFailures,
  } = useUploadBatch()
  const [linkUrl, setLinkUrl] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  // What the last action on a material row could not do; stays until the
  // author closes it or tries again.
  const [actionError, setActionError] = useState<{
    message: string
    materialName: string | null
  } | null>(null)

  // The retry asked about its price: the material in pricing, then the
  // confirmation with the price line (charging on).
  const [pricingId, setPricingId] = useState<string | null>(null)
  const [retryAsk, setRetryAsk] = useState<{
    mat: AuthoredDocumentSummary
    force: boolean
    line: string
  } | null>(null)

  // Upload confirmation state
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingFileDurations, setPendingFileDurations] = useState<
    Map<string, number | null>
  >(new Map())
  const [pendingLink, setPendingLink] = useState<string | null>(null)
  const showConfirm = pendingFiles.length > 0 || pendingLink !== null
  // One list per batch: the dialog prices it once, not on every render.
  const confirmFiles = useMemo(
    () =>
      pendingFiles.map((f) => ({
        name: f.name,
        sourceType: sourceTypeForExtension(
          f.name.split('.').pop()?.toLowerCase() ?? '',
        ),
        durationSec: pendingFileDurations.get(f.name) ?? null,
        file: f,
      })),
    [pendingFiles, pendingFileDurations],
  )

  const node = tree && selectedNodeId ? findNode(tree, selectedNodeId) : null

  const refresh = useCallback(async () => {
    if (!tree) return
    const fresh = await nodesApi.getDetail(tree.id)
    setTree(fresh)
  }, [tree, setTree])

  // File drop → shared pre-send checks (Е2: size + duration) → confirmation.
  const onDrop = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      const { accepted, durations, rejectionMessage } =
        await validateUploadFiles(language, files)
      // Always called, with an empty list when nothing was refused: a new drop
      // is a new answer, and a previous gesture's notice must not read as this
      // one's.
      reportFailures(rejectionMessage ? [rejectionMessage] : [])
      if (accepted.length > 0) {
        setPendingFiles(accepted)
        setPendingFileDurations(durations)
      }
    },
    [language, reportFailures],
  )

  // Link add → show confirmation
  const handleAddLink = useCallback(() => {
    if (!linkUrl.trim()) return
    setPendingLink(linkUrl.trim())
  }, [linkUrl])

  // Confirmed upload with role and optional task_type
  const handleConfirmUpload = useCallback(
    async (
      role: MaterialRole,
      taskType: AssignmentType | null,
      asCode: boolean,
    ) => {
      if (!node) return

      // Capture and clear immediately to close the dialog and prevent re-submission
      const filesToUpload = [...pendingFiles]
      const linkToUpload = pendingLink
      setPendingFiles([])
      setPendingFileDurations(new Map())
      setPendingLink(null)

      if (filesToUpload.length > 0) {
        const tasks: UploadTask[] = filesToUpload.map((file) => {
          const ext = file.name.split('.').pop()?.toLowerCase() || ''
          // Code axis (R6): the author's explicit «Це код» declaration overrides
          // the text default for code-eligible files only.
          const type =
            asCode && CODE_ELIGIBLE_TEXT_EXTENSIONS.includes(ext)
              ? 'code'
              : sourceTypeForExtension(ext)
          return {
            label: file.name,
            send: (onProgress) =>
              documentsApi.upload(
                node.id,
                file,
                type,
                role,
                null,
                taskType,
                onProgress,
              ),
          }
        })
        // Е9 — wake the poll after each successful file (a row appears after the
        // first, not the last); re-read the tree once after the batch (point-1).
        await runUpload(tasks, {
          onFileQueued: requestRefresh,
          onComplete: refresh,
        })
      }

      if (linkToUpload) {
        setAddingLink(true)
        try {
          const isVideo = isVideoUrl(linkToUpload)
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
          requestRefresh() // Д10 — wake the shell poll for the just-queued link
        } catch (err) {
          // Mirror the file path: surface the server's reason via the single
          // authored resolver, else a product-language fallback. The resolver
          // maps a SECURITY_REJECTED to the human dictionary and passes an
          // INTAKE_* video-duration reason through as-is; without this the link
          // door swallowed every rejection silently — no spinner-only dead end.
          // No raw / internal text ever reaches the author. Shown on the same
          // surface as a file refusal (§2.5): one place to look, whichever door
          // the material came through.
          reportFailures([
            authoredRejectionMessage(language, err) ??
              t('panel.flow.detail.addLinkFailed'),
          ])
        } finally {
          setAddingLink(false)
        }
      }
    },
    [
      node,
      pendingFiles,
      pendingLink,
      refresh,
      requestRefresh,
      runUpload,
      reportFailures,
      t,
      language,
    ],
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
    accept: UPLOAD_DROPZONE_ACCEPT,
  })

  const handleDelete = useCallback(
    async (mat: AuthoredDocumentSummary) => {
      const name = documentLabel(mat)
      // The same route hides a test: its students lose it and keep their
      // attempts, so the question names both (PRE-FLIGHT §21.5).
      const isTest = mat.source_type === 'test_object'
      const question = isTest
        ? t('panel.flow.detail.hideTestQuestion', { name })
        : t('panel.flow.detail.deleteMaterialQuestion', { name })
      if (!confirm(question)) return
      setActionError(null)
      try {
        await documentsApi.delete(mat.id)
      } catch {
        setActionError({
          message: isTest
            ? t('panel.flow.detail.hideTestFailed', { name })
            : t('panel.flow.detail.deleteMaterialFailed', { name }),
          materialName: name,
        })
        return
      }
      await refresh()
    },
    [refresh, t],
  )

  const runRetry = useCallback(
    async (mat: AuthoredDocumentSummary, force: boolean) => {
      const name = documentLabel(mat)
      setActionError(null)
      try {
        await documentsApi.retry(mat.id, force)
      } catch {
        setActionError({
          message: t('panel.flow.detail.startProcessingFailed', { name }),
          materialName: name,
        })
        return
      }
      await refresh()
      requestRefresh() // Д10 — wake the shell poll for the re-queued job
    },
    [refresh, requestRefresh, t],
  )

  const handleRetry = useCallback(
    async (mat: AuthoredDocumentSummary) => {
      // `force=true` is required to reprocess a material that already
      // reached `ready` (e.g. after changing the course/material language).
      // For error-state materials, force is harmless and still works.
      const force = mat.state !== 'error'
      // The price first, with the kind alone (the material is already on the
      // server): charging off — as before; on — the line in a confirmation.
      const kind = estimateKindOf(mat.source_type)
      setPricingId(mat.id)
      const line =
        node && kind ? await kindOnlyPriceLine(language, node.id, kind) : null
      setPricingId(null)
      if (line !== null) {
        setRetryAsk({ mat, force, line })
        return
      }
      if (force && !confirm(retryQuestion(t, mat, force))) return
      await runRetry(mat, force)
    },
    [language, node, runRetry, t],
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

      {/* Summary review/edit affordance — visible only when a summary
          exists (Ratified #2). Opening the modal lands in c3. */}
      {node.summary_status !== 'none' && (
        <div className="p-4 border-b border-canvas-dark/30">
          <button
            className="btn-primary btn-sm w-full justify-center"
            onClick={() => onOpenSummary?.(node.id, node.title)}
          >
            <FileText size={14} />
            {t('panel.flow.detail.openSummary')}
          </button>
        </div>
      )}

      {/* Upload zone */}
      <div className="p-4 border-b border-canvas-dark/30 space-y-2">
        {/* Outside the active/idle branch on purpose: a failure outlives the
            batch that produced it, and lives until the author closes it. */}
        <UploadFailuresView
          failures={uploadFailures}
          onDismiss={dismissFailures}
          context={{
            course: tree?.title ?? null,
            section: node.title ?? null,
          }}
        />
        {uploadState.active ? (
          <UploadProgressView state={uploadState} />
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
                <p className="text-sm text-navy font-medium">{t('panel.flow.detail.dropActive')}</p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={20} className="text-ink-muted" />
                <span className="text-sm text-ink-muted">{t('panel.flow.detail.dropPrompt')}</span>
                <input
                  type="file"
                  multiple
                  accept={UPLOAD_ACCEPT_ATTR}
                  // Д9: below `sm` bound the native file-picker's intrinsic width
                  // to its container (measured 349px at 320, clipped both edges).
                  // Width limit only — the system control is not replaced, hidden
                  // or wrapped (the ratified cheap bound). Gated to `<sm` so the
                  // wide panel (where 380px holds it) is unchanged.
                  className="max-sm:max-w-full text-sm text-ink-muted file:mr-2 file:py-1 file:px-3 file:rounded-lg
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
              placeholder={t('panel.flow.detail.linkPlaceholder')}
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
            {addingLink ? <Loader2 size={14} className="animate-spin" /> : t('panel.flow.detail.addLink')}
          </button>
        </div>

        {/* A test is written in the editor rather than uploaded; a YAML file
            still comes in through the drop area above. */}
        <button
          type="button"
          className="btn-secondary btn-sm w-full justify-center mt-3"
          onClick={() => navigate(newTestPath(node.id, tree?.id ?? null))}
        >
          <ListChecks size={14} />
          {t('panel.flow.detail.newTest')}
        </button>
      </div>

      {/* Outside the scrolling list, so it is seen whichever row was used. */}
      {actionError && (
        <div className="px-4 pt-4">
          <div
            role="alert"
            className="border border-coral/40 bg-coral-pale rounded-xl p-3 flex gap-2"
          >
            <AlertCircle size={16} className="text-coral shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-ink break-words">
                {actionError.message}
              </p>
              <ContactAdmin
                message={actionError.message}
                context={{
                  course: tree?.title ?? null,
                  section: node.title ?? null,
                  material: actionError.materialName,
                }}
                fallback="after-click"
              />
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label={t('panel.flow.detail.closeError')}
              className="shrink-0 p-1 rounded-lg text-coral hover:bg-coral/10
                         transition-colors cursor-pointer self-start"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {node.authored_documents.length === 0 ? (
          <p className="text-ink-muted text-sm text-center py-8">
            {t('panel.flow.detail.noDocuments')}
          </p>
        ) : (
          node.authored_documents.map((mat) => {
            const meta = sourceTypeMeta(language, mat.source_type)
            const Icon = iconMap[meta.icon] || FileIcon
            const isMethodological = mat.material_role === 'methodological'
            // A test is written, never processed: no phase to show, nothing
            // to reprocess, and its role is fixed (decisions 13 and 19).
            const isTest = mat.source_type === 'test_object'
            // Б2: whether students see it — the editor's own chips, as its
            // toolbar shows them (``changed`` is two); none when the tree does
            // not say (an older backend, an unread state).
            const testChips = isTest ? testStateChips(language, mat.test_state) : []
            // Д1: the live job of THIS material from the shared store (anchor =
            // material_id). Its movement/duration is the same the strip shows.
            const liveJob = workItems.find(
              (j) => j.material_id === mat.id && j.job_state === 'processing',
            )
            return (
              <div key={mat.id} className="space-y-1.5">
                <div
                  className="flex items-center gap-3 p-3 rounded-xl bg-canvas hover:bg-canvas-dark/50
                             transition-colors group"
                >
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0">
                  <Icon size={16} className={meta.color} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {documentLabel(mat)}
                  </p>
                  {/* Д9: below the panel's narrow width the status badge, the
                      role toggle and the confirm-roles button overran the right
                      edge (measured 327 at 320); flex-wrap lets the trailing
                      control drop to the next line instead of clipping. */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {!isTest && <StatusBadge phase={mat.processing_phase} />}
                    {testChips.map((chip) => (
                      <Chip key={chip.label} tone={chip.chipTone} title={chip.hint}>
                        {chip.label}
                      </Chip>
                    ))}
                    {!isTest && (
                      <button
                        onClick={() => handleToggleRole(mat)}
                        className={`
                          text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer
                          transition-colors
                          ${isMethodological
                            ? 'bg-plum/10 text-plum hover:bg-plum/20'
                            : 'bg-navy/6 text-ink-muted hover:bg-navy/12'}
                        `}
                        title={t('panel.flow.detail.toggleRoleHint')}
                      >
                        {isMethodological ? t('panel.flow.detail.roleMethodological') : t('panel.flow.detail.roleEducational')}
                      </button>
                    )}
                    {isTest && (
                      <button
                        type="button"
                        onClick={() => navigate(testEditorPath(mat.id))}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium
                                   bg-navy text-white hover:bg-navy-light
                                   transition-colors cursor-pointer"
                        title={t('panel.flow.detail.openTestHint')}
                      >
                        {t('panel.flow.detail.openTest')}
                      </button>
                    )}
                    {mat.processing_phase === 'awaiting_author' && (
                      <button
                        onClick={() =>
                          navigate(`/document/${mat.id}/confirm-roles`)
                        }
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium
                                   bg-navy text-white hover:bg-navy-light
                                   transition-colors cursor-pointer"
                        title={t('panel.flow.detail.confirmRolesHint')}
                      >
                        {t('panel.flow.detail.confirmRoles')}
                      </button>
                    )}
                  </div>
                  {mat.processing_phase === 'error' &&
                    mat.error_category === INSUFFICIENT_UNITS_CATEGORY && (
                      <>
                        <p className="text-xs text-coral mt-1">
                          {ingestErrorMessage(language, mat.error_category)}
                        </p>
                        {/* Beside the card's own retry: the purchase, in a new
                            tab; the retry stays as it is. */}
                        <p className="text-xs mt-1">
                          <NewTabLink href="/billing">{buyUnitsText(language)}</NewTabLink>
                        </p>
                      </>
                    )}
                  {mat.processing_phase === 'error' &&
                    mat.error_category !== INSUFFICIENT_UNITS_CATEGORY &&
                    (mat.error_category || mat.error_message) && (
                    <>
                      <p className="text-xs text-coral mt-1 line-clamp-2">
                        {ingestErrorMessage(language, mat.error_category)}
                      </p>
                      <ContactAdmin
                        message={ingestErrorMessage(language, mat.error_category)}
                        context={{
                          course: tree?.title ?? null,
                          section: node.title ?? null,
                          material: documentLabel(mat),
                        }}
                        fallback="after-click"
                        compact
                      />
                    </>
                  )}
                  <MaterialProgressDetail job={liveJob} now={now} />
                  {/* §2.6: only a code material has a structure to show, and
                      only once processing has produced one — the route 404s
                      otherwise, and the block removes itself when it does. */}
                  {mat.source_type === 'code' && mat.state === 'ready' && (
                    <DocumentStructureBlock documentId={mat.id} />
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isTest && (mat.state === 'error' || mat.state === 'ready') && (
                    <button
                      onClick={() => handleRetry(mat)}
                      disabled={pricingId === mat.id}
                      className="p-1.5 rounded-lg hover:bg-amber-pale transition-colors"
                      title={
                        pricingId === mat.id
                          ? pricePendingText(language)
                          : mat.state === 'error'
                            ? t('panel.flow.detail.retryProcessingHint')
                            : t('panel.flow.detail.retryProcessingForceHint')
                      }
                    >
                      {pricingId === mat.id ? (
                        <Loader2 size={14} className="animate-spin text-amber" />
                      ) : (
                        <RotateCcw size={14} className="text-amber" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(mat)}
                    className="p-1.5 rounded-lg hover:bg-coral-pale transition-colors"
                    title={isTest ? t('panel.flow.detail.hideTestHint') : t('panel.flow.detail.deleteMaterialHint')}
                  >
                    <Trash2 size={14} className="text-coral" />
                  </button>
                </div>
                </div>
                {mat.task_type === 'project' && (
                  <div className="ml-2 pl-3 border-l-2 border-canvas-dark/40">
                    <ProjectBaseSection documentId={mat.id} />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* A retry while charging is on: the price line, then the run. */}
      <Modal
        open={retryAsk !== null}
        onClose={() => setRetryAsk(null)}
        title={t('panel.flow.detail.retryModalTitle')}
      >
        {retryAsk && (
          <>
            <p className="text-sm text-ink mb-3">
              {retryQuestion(t, retryAsk.mat, retryAsk.force)}
            </p>
            <p className="text-sm text-ink-light mb-4">{retryAsk.line}</p>
            <div className="flex justify-end gap-2">
              <button
                className="btn-secondary btn-sm"
                onClick={() => setRetryAsk(null)}
              >
                {t('panel.flow.detail.retryModalCancel')}
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={() => {
                  const { mat, force } = retryAsk
                  setRetryAsk(null)
                  void runRetry(mat, force)
                }}
              >
                {t('panel.flow.detail.retryModalConfirm')}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Upload confirmation dialog */}
      <UploadConfirmDialog
        open={showConfirm}
        files={confirmFiles}
        linkUrl={pendingLink || undefined}
        nodeId={node.id}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />
    </div>
  )
}
