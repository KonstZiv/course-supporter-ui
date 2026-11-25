import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, Download, Loader2 } from 'lucide-react'
import { ApiError } from '../api/client'
import { studentsApi } from '../api/students'
import type {
  AuthorCriterionVerdictValue,
  AuthorRemarkState,
  AuthorSubmissionDetail,
  CriteriaWeight,
  RemarkCommentAuthor,
  RemarkCommentKind,
  RemarkThread,
} from '../types/api'
import { MarkdownContent } from '../portal/components/MarkdownContent'
import { presentationStateKey } from '../components/students/submissionHelpers'
import { useLanguage, useT } from '../i18n/LanguageContext'
import type { MessageKey } from '../i18n/translate'
import { findLanguage } from '../utils/languages'
import { formatDate } from '../utils/units'

const WEIGHT_KEYS: Record<CriteriaWeight, MessageKey> = {
  must: 'panel.criteria.weight.must',
  should: 'panel.criteria.weight.should',
  may: 'panel.criteria.weight.may',
}

const VERDICT_KEYS: Record<AuthorCriterionVerdictValue, MessageKey> = {
  met: 'panel.submission.verdict.met',
  not_met: 'panel.submission.verdict.notMet',
  unconfirmed: 'panel.submission.verdict.unconfirmed',
}

const REMARK_KEYS: Record<AuthorRemarkState, MessageKey> = {
  new: 'panel.submission.remark.new',
  open: 'panel.submission.remark.open',
  fixed: 'panel.submission.remark.fixed',
  broken: 'panel.submission.remark.broken',
}

const FEEDBACK_KEYS: Record<string, MessageKey> = {
  helped: 'panel.submission.feedback.helped',
  not_helped: 'panel.submission.feedback.notHelped',
}

const COMMENT_AUTHOR_KEYS: Record<RemarkCommentAuthor, MessageKey> = {
  student: 'panel.submission.comment.student',
  mentor: 'panel.submission.comment.mentor',
}

const COMMENT_KIND_KEYS: Record<RemarkCommentKind, MessageKey> = {
  question: 'panel.submission.comment.kind.question',
  objection: 'panel.submission.comment.kind.objection',
  comment: 'panel.submission.comment.kind.comment',
  answer: 'panel.submission.comment.kind.answer',
}

export function StudentSubmissionPage() {
  const { studentId = '', submissionId = '' } = useParams()
  const language = useLanguage()
  const t = useT()

  const [detail, setDetail] = useState<AuthorSubmissionDetail | null>(null)
  const [threads, setThreads] = useState<RemarkThread[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    if (!studentId || !submissionId) return
    const requestId = ++requestRef.current
    setLoading(true)
    setNotFound(false)
    setError(false)
    setDownloadError(false)
    setThreads([])
    try {
      const commentsPromise = Promise.resolve(
        studentsApi.submissionComments(studentId, submissionId),
      ).catch(() => null)
      const [data, commentsData] = await Promise.all([
        studentsApi.submission(studentId, submissionId),
        commentsPromise,
      ])
      if (requestId !== requestRef.current) return
      setDetail(data)
      setThreads(
        commentsData?.threads?.filter((th) => th.comments.length > 0) ?? [],
      )
    } catch (err) {
      if (requestId !== requestRef.current) return
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        setError(true)
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
      }
    }
  }, [studentId, submissionId])

  const criteriaTextById = useMemo(
    () => new Map(detail?.criteria.map((c) => [c.item_id, c.text]) ?? []),
    [detail?.criteria],
  )

  useEffect(() => {
    void load()
  }, [load])

  const handleDownload = async () => {
    setDownloading(true)
    setDownloadError(false)
    try {
      const link = await studentsApi.submissionFile(studentId, submissionId)
      window.open(link.url, '_blank', 'noopener,noreferrer')
    } catch {
      setDownloadError(true)
    } finally {
      setDownloading(false)
    }
  }

  const backPath = `/students/${encodeURIComponent(studentId)}`

  if (loading && !detail) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to={backPath} className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.submission.back')}
          </Link>
        </div>
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-navy" />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to={backPath} className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.submission.back')}
          </Link>
        </div>
        <div className="card p-6 text-ink-light">{t('panel.submission.notFound')}</div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="mb-6">
          <Link to={backPath} className="btn-ghost btn-sm inline-flex items-center gap-1">
            {t('panel.submission.back')}
          </Link>
        </div>
        <div className="card p-4 flex items-center justify-between gap-4 text-coral">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{t('panel.submission.loadFailed')}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => void load()}>
            {t('panel.criteria.retry')}
          </button>
        </div>
      </div>
    )
  }

  const isTest = detail.task_type === 'test'
  const reviewLangName = detail.review_language
    ? (findLanguage(detail.review_language)?.name_en ?? detail.review_language)
    : null
  const stateKey = !detail.reviewed_at ? presentationStateKey(detail.presentation) : null
  const feedbackKey = detail.own_feedback
    ? FEEDBACK_KEYS[detail.own_feedback.value]
    : undefined

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
      <div>
        <Link to={backPath} className="btn-ghost btn-sm inline-flex items-center gap-1">
          {t('panel.submission.back')}
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="page-title">
            {detail.task_title} · {detail.course_title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-light">
            <span>{detail.student.display_name || detail.student.student_id}</span>
            {detail.attempt_no !== null && detail.attempt_no !== undefined && (
              <span>{t('panel.submission.attempt', { n: detail.attempt_no })}</span>
            )}
            <span>
              {t('panel.submission.submittedAt', {
                date: formatDate(language, detail.created_at),
              })}
            </span>
            {detail.reviewed_at && (
              <span>
                {t('panel.submission.reviewedAt', {
                  date: formatDate(language, detail.reviewed_at),
                })}
              </span>
            )}
            {reviewLangName && (
              <span>
                {t('panel.submission.language', { language: reviewLangName })}
              </span>
            )}
          </div>
          {(stateKey || detail.rejection || detail.is_repeat_copy) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {stateKey && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-muted">
                  {t(stateKey)}
                </span>
              )}
              {detail.rejection && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-coral/10 text-coral">
                  {t('panel.studentWork.rejected')}
                </span>
              )}
              {detail.is_repeat_copy && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-muted">
                  {t('panel.studentWork.repeatCopy')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!isTest && (
            <button
              className="btn-ghost btn-sm"
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {t('panel.submission.download')}
            </button>
          )}
          {!isTest && (
            <Link
              to={`/task/${encodeURIComponent(detail.task_document_id)}/criteria`}
              className="btn-ghost btn-sm"
            >
              {t('panel.submission.openCriteria')}
            </Link>
          )}
          {detail.previous_submission_id && (
            <Link
              to={`/students/${encodeURIComponent(studentId)}/submissions/${encodeURIComponent(detail.previous_submission_id)}`}
              className="btn-ghost btn-sm"
            >
              {t('panel.submission.previous')}
            </Link>
          )}
        </div>
      </div>

      {downloadError && (
        <div className="card p-4 flex items-center gap-2 text-coral text-sm">
          <AlertCircle size={16} />
          <span>{t('panel.submission.downloadFailed')}</span>
        </div>
      )}

      {(detail.score !== null && detail.score !== undefined) ||
      detail.verdict ||
      detail.pass_rule ? (
        <div className="card p-6 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {detail.score !== null && detail.score !== undefined && (
              <span className="font-semibold text-ink text-base">
                {t('panel.submission.score', { score: detail.score })}
              </span>
            )}
            {detail.verdict && (
              <span
                className={
                  detail.verdict.passed
                    ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sun-pale text-ink border border-sun'
                    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-coral/10 text-coral'
                }
              >
                {detail.verdict.passed
                  ? t('panel.submission.passed')
                  : t('panel.submission.notPassed')}
              </span>
            )}
          </div>
          {detail.pass_rule && (
            <p className="text-sm text-ink-light">
              {detail.pass_rule.required_musts != null &&
              detail.pass_rule.required_musts > 0
                ? t('panel.submission.ruleMusts', {
                    count: detail.pass_rule.required_musts,
                    threshold: detail.pass_rule.threshold,
                  })
                : t('panel.submission.rule', {
                    threshold: detail.pass_rule.threshold,
                  })}
            </p>
          )}
        </div>
      ) : null}

      {detail.criteria.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t('panel.submission.criteriaTitle')}
          </h2>
          <div className="space-y-3">
            {detail.criteria.map((c) => {
              const weightLabel =
                c.item_kind === 'point' || !c.weight
                  ? t('panel.submission.point')
                  : t(WEIGHT_KEYS[c.weight])
              const verdictKey = VERDICT_KEYS[c.verdict]
              const remarkKey = c.remark_state
                ? REMARK_KEYS[c.remark_state]
                : undefined
              return (
                <div key={c.item_id} className="card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-canvas-dark/40 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-muted">
                        {weightLabel}
                      </span>
                      {c.must_by_author && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sun-pale text-ink border border-sun">
                          {t('panel.criteria.mark.mandatory')}
                        </span>
                      )}
                      {remarkKey && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-canvas-dark text-ink-light">
                          {t(remarkKey)}
                        </span>
                      )}
                    </div>
                    {verdictKey && (
                      <span
                        className={
                          c.verdict === 'not_met'
                            ? 'text-xs font-medium text-coral'
                            : 'text-xs font-medium text-ink'
                        }
                      >
                        {t(verdictKey)}
                      </span>
                    )}
                  </div>

                  <p className="text-body text-ink whitespace-pre-wrap">{c.text}</p>

                  {c.quote && (
                    <div>
                      <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                        {t('panel.submission.quote')}
                      </span>
                      <p className="text-sm text-ink-light whitespace-pre-wrap">
                        {c.quote}
                      </p>
                    </div>
                  )}

                  {c.missing && (
                    <div>
                      <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                        {t('panel.submission.missing')}
                      </span>
                      <p className="text-sm text-ink-light whitespace-pre-wrap">
                        {c.missing}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card p-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t('panel.submission.reviewTitle')}
        </h2>
        {detail.review_markdown ? (
          <MarkdownContent markdown={detail.review_markdown} />
        ) : (
          <p className="text-sm text-ink-muted">{t('panel.submission.noReview')}</p>
        )}
        {feedbackKey && (
          <p className="text-sm text-ink-light pt-2 border-t border-canvas-dark/40">
            {t(feedbackKey)}
          </p>
        )}
      </div>

      {threads.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t('panel.submission.threadsTitle')}
          </h2>
          <div className="space-y-3">
            {threads.map((thread) => {
              const criterionText = criteriaTextById.get(thread.item_id)
              return (
                <div key={thread.item_id} className="card p-5 space-y-3">
                  {criterionText && (
                    <p className="text-sm font-medium text-ink border-b border-canvas-dark/40 pb-2 whitespace-pre-wrap">
                      {criterionText}
                    </p>
                  )}
                  <div className="space-y-3">
                    {thread.comments.map((comment) => {
                      const authorKey = COMMENT_AUTHOR_KEYS[comment.author]
                      const kindKey = COMMENT_KIND_KEYS[comment.kind]
                      return (
                        <div key={comment.id} className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                            <span className="font-semibold text-ink">
                              {authorKey ? t(authorKey) : comment.author}
                            </span>
                            <span>·</span>
                            <span>{kindKey ? t(kindKey) : comment.kind}</span>
                            <span>·</span>
                            <span>{formatDate(language, comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-ink whitespace-pre-wrap break-words">
                            {comment.body}
                          </p>
                          {comment.answered_in_submission_id && (
                            <div>
                              <Link
                                to={`/students/${encodeURIComponent(studentId)}/submissions/${encodeURIComponent(comment.answered_in_submission_id)}`}
                                className="text-xs font-medium text-navy hover:underline"
                              >
                                {t('panel.submission.comment.answeredIn')}
                              </Link>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
