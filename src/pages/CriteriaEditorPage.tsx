import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from 'lucide-react'
import { documentsApi } from '../api/documents'
import { criteriaApi, criteriaRefusal } from '../api/criteria'
import { ApiError } from '../api/client'
import { useT } from '../i18n/LanguageContext'
import { useCourseStore } from '../stores/course'
import { documentLabel } from '../utils/documentLabel'
import { testEditorPath } from '../utils/testAddress'
import { CriteriaHeader } from '../components/criteriaEditor/CriteriaHeader'
import { PassRule } from '../components/criteriaEditor/PassRule'
import { CriterionView } from '../components/criteriaEditor/CriterionView'
import { ContradictionsBlock } from '../components/criteriaEditor/ContradictionsBlock'
import { CriteriaStatusCard } from '../components/criteriaEditor/CriteriaStatusCard'
import { CriterionForm } from '../components/criteriaEditor/CriterionForm'
import { EditorBar } from '../components/criteriaEditor/EditorBar'
import { useCriteriaEditor } from '../components/criteriaEditor/useCriteriaEditor'
import { ConfirmDialog } from '../components/testEditor/ConfirmDialog'
import { ContactAdmin } from '../components/ui/ContactAdmin'
import { CRITERIA_LIMITS } from '../utils/criteriaRules'
import type { AuthoredDocumentResponse, CriteriaView } from '../types/api'

type PageError =
  | { kind: 'notFound' }
  | { kind: 'notATextTask' }
  | { kind: 'taskNotReady' }
  | { kind: 'noAccess' }
  | { kind: 'tooManyRequests' }
  | { kind: 'failedLoad' }

interface CriteriaEditorFormProps {
  criteria: CriteriaView
  doc: AuthoredDocumentResponse | null
  documentId: string
  courseTitle: string | null
  onSaved: (updatedView: CriteriaView) => void
  onCancel: () => void
  onAwaitingFirstSubmission: () => void
  onRefreshConcepts: () => void
  onReload: () => void
}

function CriteriaEditorForm({
  criteria,
  doc,
  documentId,
  courseTitle,
  onSaved,
  onCancel,
  onAwaitingFirstSubmission,
  onRefreshConcepts,
  onReload,
}: CriteriaEditorFormProps) {
  const t = useT()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const {
    items,
    unsaved,
    isValid,
    saving,
    rateLimited,
    serverError,
    serverFieldErrors,
    blocker,
    saveAttempted,
    revealErrors,
    updateCriterion,
    addCriterion,
    removeCriterion,
    moveCriterion,
    save,
    clearServerError,
  } = useCriteriaEditor({
    documentId,
    initialCriteria: criteria.in_force?.criteria ?? [],
    layer: criteria.in_force?.layer ?? 'model',
    taskType: doc?.task_type ?? null,
    onSaved,
    onAwaitingFirstSubmission,
    onRefreshConcepts,
  })

  const handleCancelClick = () => {
    if (unsaved) {
      setShowCancelConfirm(true)
    } else {
      onCancel()
    }
  }

  const handleRefreshListClick = () => {
    if (unsaved) {
      setShowCancelConfirm(true)
    } else {
      onReload()
    }
  }

  return (
    <div className="space-y-6">
      {/* Server refusal banner over the form (spec 3.К10) */}
      {serverError && (
        <div className="card p-4 border border-coral bg-coral-pale/40 text-ink space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <AlertCircle size={20} className="text-coral shrink-0 mt-0.5" />
              <div className="space-y-2 min-w-0 flex-1">
                {serverError.kind === 'awaitingFirstSubmission' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.awaitingFirstSubmission')}
                  </p>
                )}
                {serverError.kind === 'unknownCriterionId' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.unknownCriterionId')}
                  </p>
                )}
                {serverError.kind === 'checkMethodNotAdmitted' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.checkMethodNotAdmitted')}
                  </p>
                )}
                {serverError.kind === 'unknownConcept' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.unknownConcept')}
                  </p>
                )}
                {serverError.kind === 'mustByAuthorWithoutMust' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.mustByAuthorWithoutMust')}
                  </p>
                )}
                {serverError.kind === 'invalidField' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.invalidField')}
                  </p>
                )}
                {serverError.kind === 'taskNotReady' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.taskNotReady')}
                  </p>
                )}
                {serverError.kind === 'noAccess' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.noAccess')}
                  </p>
                )}
                {serverError.kind === 'tooManyRequests' && (
                  <p className="text-sm">
                    {t('panel.criteria.refusal.tooManyRequests')}
                  </p>
                )}
                {serverError.kind === 'failedSave' && (
                  <p className="text-sm">
                    {t('panel.criteria.failed.save')}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {serverError.kind === 'unknownCriterionId' && (
                    <button
                      type="button"
                      onClick={handleRefreshListClick}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {t('panel.criteria.refreshList')}
                    </button>
                  )}
                  {serverError.kind === 'taskNotReady' && (
                    <button
                      type="button"
                      onClick={onReload}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {t('panel.criteria.refresh')}
                    </button>
                  )}
                  {serverError.kind === 'failedSave' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void save()}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        {t('panel.criteria.retry')}
                      </button>
                      {serverError.is5xx && (
                        <ContactAdmin
                          fallback="after-click"
                          context={{
                            course: courseTitle,
                            material: doc ? documentLabel(doc) : null,
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearServerError}
              aria-label={t('panel.criteria.closeMessage')}
              title={t('panel.criteria.closeMessage')}
              className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Criteria form cards */}
      <div className="space-y-4">
        {items.map((item, idx) => (
          <CriterionForm
            key={item.id ?? `new-${idx}`}
            criterion={item}
            index={idx}
            totalCount={items.length}
            availableConcepts={criteria.concepts ?? []}
            taskType={doc?.task_type ?? null}
            disabled={saving}
            saveAttempted={saveAttempted}
            serverFieldErrors={serverFieldErrors
              .filter((e) => e.index === idx)
              .map((e) => e.field)}
            onChange={(patch) => updateCriterion(idx, patch)}
            onMove={(direction) => moveCriterion(idx, direction)}
            onRemove={() => removeCriterion(idx)}
          />
        ))}
      </div>

      {/* Add criterion button */}
      <div>
        <button
          type="button"
          disabled={saving || items.length >= CRITERIA_LIMITS.maxCriteria}
          onClick={addCriterion}
          title={
            items.length >= CRITERIA_LIMITS.maxCriteria
              ? t('panel.criteria.problem.tooManyCriteria', {
                  max: CRITERIA_LIMITS.maxCriteria,
                })
              : undefined
          }
          className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
        >
          <Plus size={16} />
          {t('panel.criteria.addCriterion')}
        </button>
      </div>

      {/* Sticky Bottom Action Bar */}
      <EditorBar
        unsaved={unsaved}
        formCriteria={items}
        saving={saving}
        hasErrors={!isValid}
        saveDisabled={rateLimited}
        onSave={() => void save()}
        onRevealErrors={revealErrors}
        onCancel={handleCancelClick}
      />

      {/* Confirm dialog for leaving/canceling with unsaved changes */}
      <ConfirmDialog
        open={blocker.state === 'blocked' || showCancelConfirm}
        title={t('panel.criteria.leaveTitle')}
        cancelLabel={t('panel.criteria.stay')}
        confirmLabel={t('panel.criteria.leave')}
        confirmClass="btn-danger"
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset?.()
          setShowCancelConfirm(false)
        }}
        onConfirm={() => {
          if (blocker.state === 'blocked') {
            blocker.proceed?.()
          } else {
            setShowCancelConfirm(false)
            onCancel()
          }
        }}
      >
        <p>{t('panel.criteria.leaveText')}</p>
      </ConfirmDialog>
    </div>
  )
}

export function CriteriaEditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const t = useT()
  const tree = useCourseStore((s) => s.tree)

  const [doc, setDoc] = useState<AuthoredDocumentResponse | null>(null)
  const [criteria, setCriteria] = useState<CriteriaView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageError | null>(null)
  const [showModelList, setShowModelList] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [successBanner, setSuccessBanner] = useState<{
    kind: 'saved' | 'savedWaiting' | 'resetDone'
    works?: number
  } | null>(null)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetError, setResetError] = useState<{
    kind: 'failedReset' | 'tooManyRequests' | 'taskNotReady' | 'noAccess'
    is5xx?: boolean
  } | null>(null)
  const [resetRateLimited, setResetRateLimited] = useState(false)
  const [showComposeConfirm, setShowComposeConfirm] = useState(false)
  const [composing, setComposing] = useState(false)
  const [composeError, setComposeError] = useState<{
    kind:
      | 'insufficientUnits'
      | 'taskNotReady'
      | 'noAccess'
      | 'tooManyRequests'
      | 'failedCompose'
    is5xx?: boolean
  } | null>(null)

  useEffect(() => {
    if (!resetRateLimited) return
    const timer = setTimeout(() => {
      setResetRateLimited(false)
    }, 60000)
    return () => clearTimeout(timer)
  }, [resetRateLimited])

  const load = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError(null)
    setComposeError(null)

    try {
      const [docSettled, criteriaSettled] = await Promise.allSettled([
        documentsApi.get(documentId),
        criteriaApi.read(documentId),
      ])

      if (docSettled.status === 'fulfilled') {
        setDoc(docSettled.value)
      }

      if (criteriaSettled.status === 'fulfilled') {
        setCriteria(criteriaSettled.value)
      } else {
        const err = criteriaSettled.reason
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError({ kind: 'notFound' })
          } else if (err.status === 403) {
            setError({ kind: 'noAccess' })
          } else if (err.status === 429) {
            setError({ kind: 'tooManyRequests' })
          } else if (err.status === 422) {
            const refusal = criteriaRefusal(err.body)
            if (refusal?.kind === 'coded') {
              if (refusal.code === 'NOT_A_TEXT_TASK') {
                setError({ kind: 'notATextTask' })
              } else if (refusal.code === 'TASK_NOT_READY') {
                setError({ kind: 'taskNotReady' })
              } else {
                setError({ kind: 'failedLoad' })
              }
            } else {
              setError({ kind: 'failedLoad' })
            }
          } else {
            setError({ kind: 'failedLoad' })
          }
        } else {
          setError({ kind: 'failedLoad' })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    void load()
  }, [load])

  const pollCriteria = useCallback(async () => {
    if (!documentId) return
    try {
      const updated = await criteriaApi.read(documentId)
      setCriteria(updated)
    } catch {
      // Keep polling on transient read failure; manual refresh remains available.
    }
  }, [documentId])

  // Periodic polling every 10s while criteria composing
  useEffect(() => {
    if (criteria?.status !== 'composing' || !documentId) return
    const timer = setInterval(() => {
      void pollCriteria()
    }, 10000)
    return () => clearInterval(timer)
  }, [criteria?.status, documentId, pollCriteria])

  const refreshConcepts = useCallback(async () => {
    if (!documentId) return
    try {
      const updated = await criteriaApi.read(documentId)
      setCriteria((prev) =>
        prev ? { ...prev, concepts: updated.concepts } : updated,
      )
    } catch {
      // ignore concept refresh failure
    }
  }, [documentId])

  const handleSaved = useCallback((updatedView: CriteriaView) => {
    setCriteria(updatedView)
    setIsEditing(false)
    setResetError(null)
    const waiting = updatedView.waiting_submissions ?? 0
    if (waiting > 0) {
      setSuccessBanner({ kind: 'savedWaiting', works: waiting })
    } else {
      setSuccessBanner({ kind: 'saved' })
    }
  }, [])

  const handleReset = useCallback(async () => {
    if (!documentId || resetting || resetRateLimited) return
    setResetting(true)
    setResetError(null)

    try {
      const updatedView = await criteriaApi.reset(documentId)
      setShowResetConfirm(false)
      setCriteria(updatedView)
      setIsEditing(false)
      const waiting = updatedView.waiting_submissions ?? 0
      if (waiting > 0) {
        setSuccessBanner({ kind: 'savedWaiting', works: waiting })
      } else {
        setSuccessBanner({ kind: 'resetDone' })
      }
    } catch (err) {
      setShowResetConfirm(false)
      if (err instanceof ApiError) {
        if (err.status === 422) {
          const refusal = criteriaRefusal(err.body)
          if (refusal?.kind === 'coded' && refusal.code === 'TASK_NOT_READY') {
            setResetError({ kind: 'taskNotReady' })
          } else {
            setResetError({ kind: 'failedReset' })
          }
        } else if (err.status === 403) {
          setResetError({ kind: 'noAccess' })
        } else if (err.status === 429) {
          setResetError({ kind: 'tooManyRequests' })
          setResetRateLimited(true)
        } else if (err.status >= 500) {
          setResetError({ kind: 'failedReset', is5xx: true })
        } else {
          setResetError({ kind: 'failedReset' })
        }
      } else {
        setResetError({ kind: 'failedReset' })
      }
    } finally {
      setResetting(false)
    }
  }, [documentId, resetting, resetRateLimited])

  const handleCompose = useCallback(async () => {
    if (!documentId || composing) return
    setComposing(true)
    setComposeError(null)

    try {
      const updatedView = await criteriaApi.compose(documentId)
      setShowComposeConfirm(false)
      setCriteria(updatedView)
    } catch (err) {
      setShowComposeConfirm(false)
      if (err instanceof ApiError) {
        if (err.status === 402) {
          setComposeError({ kind: 'insufficientUnits' })
        } else if (err.status === 404) {
          setError({ kind: 'notFound' })
        } else if (err.status === 403) {
          setComposeError({ kind: 'noAccess' })
        } else if (err.status === 429) {
          setComposeError({ kind: 'tooManyRequests' })
        } else if (err.status === 422) {
          const refusal = criteriaRefusal(err.body)
          if (refusal?.kind === 'coded' && refusal.code === 'NOT_A_TEXT_TASK') {
            setError({ kind: 'notATextTask' })
          } else if (refusal?.kind === 'coded' && refusal.code === 'TASK_NOT_READY') {
            setComposeError({ kind: 'taskNotReady' })
          } else {
            setComposeError({ kind: 'failedCompose' })
          }
        } else if (err.status >= 500) {
          setComposeError({ kind: 'failedCompose', is5xx: true })
        } else {
          // Covers 409 GENERATION_IN_PROGRESS and any other unexpected 4xx refusal.
          setComposeError({ kind: 'failedCompose' })
        }
      } else {
        setComposeError({ kind: 'failedCompose' })
      }
    } finally {
      setComposing(false)
    }
  }, [documentId, composing])

  const backPath = doc?.course_root_id
    ? `/course/${doc.course_root_id}${doc.course_node_id ? `?selected=${doc.course_node_id}` : ''}`
    : '/'

  const docTitle = doc ? documentLabel(doc) : ''
  const isTest = doc?.task_type === 'test'

  return (
    <div className="min-h-screen bg-canvas">
      <CriteriaHeader
        title={docTitle}
        taskType={doc?.task_type ?? null}
        courseRootId={doc?.course_root_id ?? null}
        courseNodeId={doc?.course_node_id ?? null}
      />

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="card p-10 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 size={32} className="animate-spin text-navy" />
            <p className="text-ink-muted text-sm">{t('panel.criteria.loading')}</p>
          </div>
        ) : error ? (
          /* Full page error card replaces the list. A2 fix: no close message button here. */
          <div className="card p-6 space-y-4">
            <div className="flex items-start gap-3 min-w-0">
              <AlertCircle size={20} className="text-coral shrink-0 mt-0.5" />
              <div className="space-y-3 min-w-0 flex-1">
                {error.kind === 'notFound' && (
                  <p className="text-body text-ink">
                    {t('panel.criteria.refusal.notFound')}
                  </p>
                )}
                {error.kind === 'notATextTask' && (
                  <p className="text-body text-ink">
                    {t('panel.criteria.refusal.notATextTask')}
                  </p>
                )}
                {error.kind === 'taskNotReady' && (
                  <p className="text-body text-ink">
                    {t('panel.criteria.refusal.taskNotReady')}
                  </p>
                )}
                {error.kind === 'noAccess' && (
                  <p className="text-body text-ink">
                    {t('panel.criteria.refusal.noAccess')}
                  </p>
                )}
                {error.kind === 'tooManyRequests' && (
                  <p className="text-body text-ink">
                    {t('panel.criteria.refusal.tooManyRequests')}
                  </p>
                )}
                {error.kind === 'failedLoad' && (
                  <p className="text-body text-ink">
                    {t('panel.criteria.failed.load')}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {(error.kind === 'notFound' || error.kind === 'notATextTask') && (
                    <Link to={backPath} className="btn-secondary text-sm px-4 py-2">
                      {t('panel.criteria.back')}
                    </Link>
                  )}

                  {error.kind === 'notATextTask' && isTest && documentId && (
                    <Link
                      to={testEditorPath(documentId)}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      {t('panel.flow.detail.openTest')}
                    </Link>
                  )}

                  {error.kind === 'taskNotReady' && (
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      {t('panel.criteria.refresh')}
                    </button>
                  )}

                  {error.kind === 'failedLoad' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void load()}
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        {t('panel.criteria.retry')}
                      </button>
                      <ContactAdmin
                        fallback="after-click"
                        context={{
                          course: tree?.title ?? null,
                          material: docTitle || null,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : criteria?.status !== 'ready' && criteria ? (
          <div className="space-y-6">
            {composeError && composeError.kind !== 'insufficientUnits' && (
              <div className="card p-4 border border-coral bg-coral-pale/40 text-ink space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <AlertCircle size={20} className="text-coral shrink-0 mt-0.5" />
                    <div className="space-y-2 min-w-0 flex-1">
                      {composeError.kind === 'taskNotReady' && (
                        <p className="text-sm">
                          {t('panel.criteria.refusal.taskNotReady')}
                        </p>
                      )}
                      {composeError.kind === 'noAccess' && (
                        <p className="text-sm">
                          {t('panel.criteria.refusal.noAccess')}
                        </p>
                      )}
                      {composeError.kind === 'tooManyRequests' && (
                        <p className="text-sm">
                          {t('panel.criteria.refusal.tooManyRequests')}
                        </p>
                      )}
                      {composeError.kind === 'failedCompose' && (
                        <p className="text-sm">
                          {t('panel.billing.actionFailed')}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {composeError.kind === 'taskNotReady' && (
                          <button
                            type="button"
                            onClick={() => void load()}
                            className="btn-secondary text-xs px-3 py-1.5"
                          >
                            {t('panel.criteria.refresh')}
                          </button>
                        )}
                        {composeError.kind === 'failedCompose' &&
                          composeError.is5xx && (
                            <ContactAdmin
                              fallback="after-click"
                              context={{
                                course: tree?.title ?? null,
                                material: docTitle || null,
                              }}
                            />
                          )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setComposeError(null)}
                    aria-label={t('panel.criteria.closeMessage')}
                    title={t('panel.criteria.closeMessage')}
                    className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <CriteriaStatusCard
              status={criteria.status}
              reasonCode={criteria.reason_code}
              waitingSubmissions={criteria.waiting_submissions}
              contradictions={criteria.contradictions}
              courseRootId={doc?.course_root_id}
              courseNodeId={doc?.course_node_id}
              courseTitle={tree?.title}
              taskTitle={docTitle}
              onRefresh={() => void load()}
              onCompose={() => {
                setComposeError(null)
                setShowComposeConfirm(true)
              }}
              composeBusy={composing}
              insufficientUnits={composeError?.kind === 'insufficientUnits'}
            />

            <ConfirmDialog
              open={showComposeConfirm}
              title={t('panel.criteria.compose.title')}
              cancelLabel={t('panel.criteria.cancel')}
              confirmLabel={t('panel.criteria.compose.confirm')}
              confirmClass="btn-primary"
              busy={composing}
              onCancel={() => {
                if (!composing) setShowComposeConfirm(false)
              }}
              onConfirm={() => void handleCompose()}
            >
              <p>{t('panel.criteria.compose.text')}</p>
            </ConfirmDialog>
          </div>
        ) : criteria?.in_force ? (
          isEditing ? (
            <CriteriaEditorForm
              criteria={criteria}
              doc={doc}
              documentId={documentId!}
              courseTitle={tree?.title ?? null}
              onSaved={handleSaved}
              onCancel={() => setIsEditing(false)}
              onAwaitingFirstSubmission={() => {
                setIsEditing(false)
                void load()
              }}
              onRefreshConcepts={() => void refreshConcepts()}
              onReload={() => {
                setIsEditing(false)
                void load()
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Reset refusal banner over the list (spec 3.К10) */}
              {resetError && (
                <div className="card p-4 border border-coral bg-coral-pale/40 text-ink space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <AlertCircle size={20} className="text-coral shrink-0 mt-0.5" />
                      <div className="space-y-2 min-w-0 flex-1">
                        {resetError.kind === 'taskNotReady' && (
                          <p className="text-sm">
                            {t('panel.criteria.refusal.taskNotReady')}
                          </p>
                        )}
                        {resetError.kind === 'noAccess' && (
                          <p className="text-sm">
                            {t('panel.criteria.refusal.noAccess')}
                          </p>
                        )}
                        {resetError.kind === 'tooManyRequests' && (
                          <p className="text-sm">
                            {t('panel.criteria.refusal.tooManyRequests')}
                          </p>
                        )}
                        {resetError.kind === 'failedReset' && (
                          <p className="text-sm">
                            {t('panel.criteria.failed.reset')}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {resetError.kind === 'taskNotReady' && (
                            <button
                              type="button"
                              onClick={() => void load()}
                              className="btn-secondary text-xs px-3 py-1.5"
                            >
                              {t('panel.criteria.refresh')}
                            </button>
                          )}
                          {resetError.kind === 'failedReset' && (
                            <>
                              <button
                                type="button"
                                disabled={resetting || resetRateLimited}
                                onClick={() => void handleReset()}
                                className="btn-secondary text-xs px-3 py-1.5"
                              >
                                {t('panel.criteria.retry')}
                              </button>
                              {resetError.is5xx && (
                                <ContactAdmin
                                  fallback="after-click"
                                  context={{
                                    course: tree?.title ?? null,
                                    material: docTitle || null,
                                  }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setResetError(null)}
                      aria-label={t('panel.criteria.closeMessage')}
                      title={t('panel.criteria.closeMessage')}
                      className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Success banner after save / reset (spec 3.К8, 3.К9) */}
              {successBanner && (
                <div className="card p-4 border border-forest bg-forest-pale/40 text-ink flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-forest shrink-0" />
                    <p className="text-sm font-medium">
                      {successBanner.kind === 'saved' &&
                        t('panel.criteria.saved')}
                      {successBanner.kind === 'resetDone' &&
                        t('panel.criteria.resetDone')}
                      {successBanner.kind === 'savedWaiting' &&
                        t('panel.criteria.savedWaiting', {
                          works: successBanner.works ?? 0,
                        })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessBanner(null)}
                    aria-label={t('panel.criteria.closeMessage')}
                    title={t('panel.criteria.closeMessage')}
                    className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Layer label, count and Edit / Reset buttons above the list (spec 3.К3, 3.К4) */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    title={
                      criteria.in_force.layer === 'model'
                        ? t('panel.criteria.layer.modelHint')
                        : t('panel.criteria.layer.authorHint')
                    }
                    className="font-display text-xl text-ink font-semibold"
                  >
                    {criteria.in_force.layer === 'model'
                      ? t('panel.criteria.layer.model')
                      : t('panel.criteria.layer.author')}
                  </span>
                  <span className="text-sm text-ink-muted">
                    ({t('panel.criteria.count', {
                      count: criteria.in_force.criteria.length,
                    })})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {criteria.in_force.layer === 'author' && (
                    <button
                      type="button"
                      disabled={resetting || resetRateLimited}
                      onClick={() => setShowResetConfirm(true)}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      {t('panel.criteria.reset')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessBanner(null)
                      setResetError(null)
                      setIsEditing(true)
                    }}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    {t('panel.criteria.edit')}
                  </button>
                </div>
              </div>

              <PassRule inForce={criteria.in_force} />

              <div className="space-y-4">
                {criteria.in_force.criteria.map((c) => (
                  <CriterionView
                    key={c.id}
                    criterion={c}
                    layer={criteria.in_force!.layer}
                  />
                ))}
              </div>

              {criteria.in_force.layer === 'author' &&
                criteria.model &&
                criteria.model.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-canvas-dark/60">
                    <button
                      type="button"
                      onClick={() => setShowModelList((prev) => !prev)}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      {showModelList
                        ? t('panel.criteria.hideModel')
                        : t('panel.criteria.showModel')}
                    </button>

                    {showModelList && (
                      <div className="space-y-4 pt-2">
                        <h3 className="font-display text-lg text-ink font-semibold">
                          {t('panel.criteria.modelHeading')}
                        </h3>
                        <div className="space-y-4">
                          {criteria.model.map((c) => (
                            <CriterionView
                              key={c.id}
                              criterion={c}
                              layer={null}
                              showPassMark={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {criteria.contradictions && criteria.contradictions.length > 0 && (
                <ContradictionsBlock
                  contradictions={criteria.contradictions}
                />
              )}

              {/* Confirm dialog for resetting to system list (spec 3.К9) */}
              <ConfirmDialog
                open={showResetConfirm}
                title={t('panel.criteria.resetTitle')}
                cancelLabel={t('panel.criteria.cancel')}
                confirmLabel={t('panel.criteria.resetConfirm')}
                confirmClass="btn-danger"
                busy={resetting}
                onCancel={() => {
                  if (!resetting) setShowResetConfirm(false)
                }}
                onConfirm={() => void handleReset()}
              >
                <p>{t('panel.criteria.resetText')}</p>
              </ConfirmDialog>
            </div>
          )
        ) : null}
      </main>
    </div>
  )
}
