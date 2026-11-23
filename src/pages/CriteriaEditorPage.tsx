import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, Loader2, X } from 'lucide-react'
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
import { ContactAdmin } from '../components/ui/ContactAdmin'
import type { AuthoredDocumentResponse, CriteriaView } from '../types/api'

type PageError =
  | { kind: 'notFound' }
  | { kind: 'notATextTask' }
  | { kind: 'taskNotReady' }
  | { kind: 'noAccess' }
  | { kind: 'tooManyRequests' }
  | { kind: 'failedLoad' }

export function CriteriaEditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const t = useT()
  const tree = useCourseStore((s) => s.tree)

  const [doc, setDoc] = useState<AuthoredDocumentResponse | null>(null)
  const [criteria, setCriteria] = useState<CriteriaView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageError | null>(null)
  const [showModelList, setShowModelList] = useState(false)

  const load = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError(null)

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

  // Periodic polling every 15s while criteria composing (spec 3.К2)
  useEffect(() => {
    if (criteria?.status !== 'composing' || !documentId) return
    const timer = setInterval(() => {
      void load()
    }, 15000)
    return () => clearInterval(timer)
  }, [criteria?.status, documentId, load])

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
          <div className="card p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <AlertCircle size={20} className="text-coral shrink-0 mt-0.5" />
                <div className="space-y-3 min-w-0 flex-1">
                {error.kind === 'notFound' && (
                  <p className="text-body text-ink">{t('panel.criteria.refusal.notFound')}</p>
                )}
                {error.kind === 'notATextTask' && (
                  <p className="text-body text-ink">{t('panel.criteria.refusal.notATextTask')}</p>
                )}
                {error.kind === 'taskNotReady' && (
                  <p className="text-body text-ink">{t('panel.criteria.refusal.taskNotReady')}</p>
                )}
                {error.kind === 'noAccess' && (
                  <p className="text-body text-ink">{t('panel.criteria.refusal.noAccess')}</p>
                )}
                {error.kind === 'tooManyRequests' && (
                  <p className="text-body text-ink">{t('panel.criteria.refusal.tooManyRequests')}</p>
                )}
                {error.kind === 'failedLoad' && (
                  <p className="text-body text-ink">{t('panel.criteria.failed.load')}</p>
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
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label={t('panel.criteria.closeMessage')}
              title={t('panel.criteria.closeMessage')}
              className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        ) : criteria?.status !== 'ready' && criteria ? (
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
          />
        ) : criteria?.in_force ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
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
                  ({t('panel.criteria.count', { count: criteria.in_force.criteria.length })})
                </span>
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

            {criteria.in_force.layer === 'author' && criteria.model && criteria.model.length > 0 && (
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
              <ContradictionsBlock contradictions={criteria.contradictions} />
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
