import { useEffect, useId, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { portalApi, PortalApiError, replyRefusal } from '../api/portalClient'
import type {
  CreateRemarkComment,
  RemarkComment,
  RemarkThread,
  RemarkThreads as RemarkThreadsType,
  ReviewStructureV1,
  StudentRemarkCommentKind,
} from '../types'
import { formatCount, noteLength } from '../studentNote'
import { MarkdownContent } from './MarkdownContent'
import {
  DEFAULT_COMMENT_LIMIT,
  DEFAULT_COMMENT_MAX_CHARS,
  replyCodePhrase,
  replyErrorMessage,
} from '../replyCodes'
import { useLanguage, useT, type Translate } from '../../i18n/LanguageContext'
import { localeOf, type Language } from '../../i18n/languages'
import type { MessageKey } from '../../i18n/translate'

function formatRemarkSnippet(what: string): string {
  const match = what.match(/^.*?[.!?](?=\s|$)/s)
  const sentence = match ? match[0] : what
  const trimmed = sentence.trim()
  if (trimmed.length > 140) {
    return trimmed.slice(0, 140).trimEnd() + '…'
  }
  return trimmed
}

function formatCommentDate(language: Language, iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(localeOf(language), { dateStyle: 'short', timeStyle: 'short' })
}

interface RemarkItemMeta {
  item_id: string
  sectionKey: MessageKey
  what: string
}

const SECTIONS: Array<{
  key: 'new_remarks' | 'open' | 'broken' | 'fixed'
  labelKey: MessageKey
}> = [
  { key: 'new_remarks', labelKey: 'portal.replies.section.new' },
  { key: 'open', labelKey: 'portal.replies.section.open' },
  { key: 'broken', labelKey: 'portal.replies.section.broken' },
  { key: 'fixed', labelKey: 'portal.replies.section.fixed' },
]

interface ThreadNode {
  comment: RemarkComment
  depth: number
}

function buildThreadTree(comments: RemarkComment[]): ThreadNode[] {
  const byId = new Map<string, RemarkComment>()
  const childrenByParent = new Map<string, RemarkComment[]>()

  for (const c of comments) {
    byId.set(c.id, c)
  }

  const roots: RemarkComment[] = []
  for (const c of comments) {
    if (c.parent_id && byId.has(c.parent_id)) {
      const list = childrenByParent.get(c.parent_id) || []
      list.push(c)
      childrenByParent.set(c.parent_id, list)
    } else {
      roots.push(c)
    }
  }

  const result: ThreadNode[] = []

  function traverse(node: RemarkComment, depth: number) {
    result.push({ comment: node, depth: Math.min(depth, 3) })
    const children = childrenByParent.get(node.id) || []
    for (const child of children) {
      traverse(child, depth + 1)
    }
  }

  for (const root of roots) {
    traverse(root, 0)
  }

  return result
}

function depthIndentClass(depth: number): string {
  switch (depth) {
    case 1:
      return 'ml-3 sm:ml-5 pl-3 border-l-2 border-canvas-dark'
    case 2:
      return 'ml-6 sm:ml-10 pl-3 border-l-2 border-canvas-dark'
    case 3:
      return 'ml-9 sm:ml-12 pl-3 border-l-2 border-canvas-dark'
    default:
      return ''
  }
}

function commentAuthorLabel(t: Translate, author: 'student' | 'mentor'): string {
  return author === 'student'
    ? t('portal.replies.author.student')
    : t('portal.replies.author.mentor')
}

function commentKindLabel(
  t: Translate,
  author: 'student' | 'mentor',
  kind: string,
): string {
  if (author === 'mentor') return t('portal.replies.kind.answer')
  switch (kind) {
    case 'question':
      return t('portal.replies.kind.question')
    case 'objection':
      return t('portal.replies.kind.objection')
    case 'comment':
      return t('portal.replies.kind.comment')
    case 'answer':
      return t('portal.replies.kind.answer')
    default:
      return t('portal.replies.kind.comment')
  }
}

interface FormState {
  itemId: string
  parentId: string | null
  kind: StudentRemarkCommentKind
  body: string
  error: string
  submitting: boolean
}

export function RemarkThreads({
  submissionId,
  structure,
}: {
  submissionId: string
  structure: ReviewStructureV1 | null
}) {
  const language = useLanguage()
  const t = useT()

  const remarkItems = useMemo<RemarkItemMeta[]>(() => {
    if (!structure) return []
    const items: RemarkItemMeta[] = []
    for (const s of SECTIONS) {
      const list = structure[s.key]
      if (Array.isArray(list)) {
        for (const r of list) {
          if (r && typeof r.item_id === 'string' && r.item_id.trim() !== '') {
            items.push({
              item_id: r.item_id,
              sectionKey: s.labelKey,
              what: r.what,
            })
          }
        }
      }
    }
    return items
  }, [structure])

  const [threadsData, setThreadsData] = useState<RemarkThreadsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [formState, setFormState] = useState<FormState | null>(null)
  const [successNotices, setSuccessNotices] = useState<Record<string, string>>({})

  const formIdPrefix = useId()

  useEffect(() => {
    if (remarkItems.length === 0) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setHasError(false)

    portalApi
      .remarkThreads(submissionId)
      .then((data) => {
        if (!active) return
        setThreadsData(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) {
          return // handled centrally
        }
        setHasError(true)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [submissionId, remarkItems.length])

  // If there are no remarks with item_id, or request failed, render nothing
  if (remarkItems.length === 0 || hasError || loading || !threadsData) {
    return null
  }

  const hasOpenForm = formState !== null

  // If accepting_replies is false and no threads have comments, do not show block
  // (unless a form is currently open, e.g. holding an error)
  const hasAnyComments = threadsData.threads.some(
    (t) => t.comments && t.comments.length > 0,
  )
  if (!threadsData.accepting_replies && !hasAnyComments && !hasOpenForm) {
    return null
  }

  const threadsByItemId = new Map<string, RemarkThread>()
  for (const t of threadsData.threads) {
    threadsByItemId.set(t.item_id, t)
  }

  // Filter visible remarks: must have comments, can reply, or have an open form
  const visibleRemarks = remarkItems.filter((item) => {
    if (formState?.itemId === item.item_id) {
      return true
    }
    const thread = threadsByItemId.get(item.item_id)
    const commentsCount = thread?.comments.length ?? 0
    const studentRepliesCount =
      thread?.comments.filter(
        (c) => c.author === 'student' && c.submission_id === submissionId,
      ).length ?? 0
    const canReply =
      threadsData.accepting_replies && studentRepliesCount < DEFAULT_COMMENT_LIMIT
    return commentsCount > 0 || canReply
  })

  if (visibleRemarks.length === 0) {
    return null
  }

  const openForm = (itemId: string, parentId: string | null) => {
    setSuccessNotices((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
    setFormState({
      itemId,
      parentId,
      kind: 'question',
      body: '',
      error: '',
      submitting: false,
    })
  }

  const closeForm = () => {
    setFormState(null)
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState || formState.submitting) return

    const trimmedBody = formState.body.trim()
    const length = noteLength(formState.body)
    if (length === 0 || length > DEFAULT_COMMENT_MAX_CHARS) return

    setFormState((prev) => (prev ? { ...prev, submitting: true, error: '' } : null))

    const payload: CreateRemarkComment = {
      item_id: formState.itemId,
      kind: formState.kind,
      body: trimmedBody,
      parent_id: formState.parentId,
    }

    try {
      const newComment = await portalApi.replyToRemark(submissionId, payload)
      setThreadsData((prev) => {
        if (!prev) return prev
        const existingIdx = prev.threads.findIndex(
          (t) => t.item_id === formState.itemId,
        )
        if (existingIdx >= 0) {
          const updatedThreads = [...prev.threads]
          const existingThread = updatedThreads[existingIdx]
          if (existingThread) {
            updatedThreads[existingIdx] = {
              item_id: existingThread.item_id,
              comments: [...existingThread.comments, newComment],
            }
          }
          return { ...prev, threads: updatedThreads }
        } else {
          return {
            ...prev,
            threads: [
              ...prev.threads,
              { item_id: formState.itemId, comments: [newComment] },
            ],
          }
        }
      })
      const itemId = formState.itemId
      setFormState(null)
      setSuccessNotices((prev) => ({
        ...prev,
        [itemId]: t('portal.replies.success'),
      }))
    } catch (err) {
      const refusal = replyRefusal(err)
      const errorMsg = replyErrorMessage(err, language)

      setFormState((prev) =>
        prev ? { ...prev, submitting: false, error: errorMsg } : null,
      )

      if (
        refusal &&
        (refusal.code === 'not_latest_review' ||
          refusal.code === 'unknown_item' ||
          refusal.code === 'parent_not_in_thread')
      ) {
        portalApi
          .remarkThreads(submissionId)
          .then((fresh) => setThreadsData(fresh))
          .catch(() => {})
      }
    }
  }

  return (
    <section
      aria-label={t('portal.replies.title')}
      className="p-4 rounded-xl bg-canvas-dark/40 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-ink">{t('portal.replies.title')}</h3>
        <p className="text-xs text-ink-light mt-1">
          {threadsData.accepting_replies
            ? t('portal.replies.lead.accepting')
            : t('portal.replies.lead.closed')}
        </p>
      </div>

      <div className="space-y-4">
        {visibleRemarks.map((item) => {
          const thread = threadsByItemId.get(item.item_id)
          const allComments = thread?.comments ?? []
          const studentRepliesCount = allComments.filter(
            (c) => c.author === 'student' && c.submission_id === submissionId,
          ).length
          const canReply =
            threadsData.accepting_replies &&
            studentRepliesCount < DEFAULT_COMMENT_LIMIT

          const treeNodes = buildThreadTree(allComments)
          const isThisFormOpen = formState?.itemId === item.item_id
          const successNotice = successNotices[item.item_id]
          const parentComment = formState?.parentId
            ? allComments.find((c) => c.id === formState.parentId)
            : null
          const counterId = `${formIdPrefix}-${item.item_id}-counter`
          const errorId = `${formIdPrefix}-${item.item_id}-error`

          return (
            <div
              key={item.item_id}
              className="p-3.5 rounded-lg bg-canvas border border-canvas-dark/60 space-y-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-canvas-dark text-ink-light">
                    {t(item.sectionKey)}
                  </span>
                </div>
                <p className="text-sm font-medium text-ink">
                  {formatRemarkSnippet(item.what)}
                </p>
              </div>

              {treeNodes.length > 0 && (
                <div className="space-y-2.5 pt-1">
                  {treeNodes.map(({ comment, depth }) => {
                    const isStudent = comment.author === 'student'
                    const isMentor = comment.author === 'mentor'
                    const isWaiting =
                      isStudent &&
                      comment.answered_in_submission_id === null &&
                      !allComments.some(
                        (c) => c.author === 'mentor' && c.parent_id === comment.id,
                      )

                    return (
                      <div
                        key={comment.id}
                        className={`space-y-1 text-xs ${depthIndentClass(depth)}`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 text-ink-muted">
                          <span className="font-semibold text-ink">
                            {commentAuthorLabel(t, comment.author)}
                          </span>
                          <span>·</span>
                          <span>
                            {commentKindLabel(t, comment.author, comment.kind)}
                          </span>
                          <span>·</span>
                          <span>{formatCommentDate(language, comment.created_at)}</span>
                          {isWaiting && (
                            <>
                              <span>·</span>
                              <span className="text-amber font-medium">
                                {t('portal.replies.status.waiting')}
                              </span>
                            </>
                          )}
                          {isMentor && canReply && (
                            <button
                              type="button"
                              onClick={() => openForm(item.item_id, comment.id)}
                              className="btn-ghost btn-sm text-[11px] h-6 px-1.5 ml-auto text-ink-light"
                            >
                              {t('portal.replies.action.reply')}
                            </button>
                          )}
                        </div>

                        {isStudent ? (
                          <p className="whitespace-pre-wrap break-words text-sm text-ink pt-0.5">
                            {comment.body}
                          </p>
                        ) : (
                          <div className="text-sm text-ink pt-0.5">
                            <MarkdownContent markdown={comment.body} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {successNotice && (
                <div
                  role="status"
                  className="p-2.5 rounded-lg bg-forest-pale text-forest text-xs"
                >
                  {successNotice}
                </div>
              )}

              {canReply && !isThisFormOpen && (
                <div>
                  <button
                    type="button"
                    onClick={() => openForm(item.item_id, null)}
                    className="btn-secondary btn-sm text-xs"
                  >
                    {t('portal.replies.action.reply')}
                  </button>
                </div>
              )}

              {isThisFormOpen && (
                <form
                  onSubmit={handleSubmitReply}
                  className="p-3 rounded-lg bg-canvas-dark/30 space-y-3 pt-2"
                >
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-${item.item_id}-kind`}
                      className="block text-xs font-medium text-ink-light mb-1"
                    >
                      {t('portal.replies.form.kindLabel')}
                    </label>
                    <select
                      id={`${formIdPrefix}-${item.item_id}-kind`}
                      value={formState.kind}
                      onChange={(e) =>
                        setFormState((prev) =>
                          prev
                            ? {
                                ...prev,
                                kind: e.target.value as StudentRemarkCommentKind,
                              }
                            : null,
                        )
                      }
                      className="input text-xs py-1 px-2.5 h-8 bg-canvas"
                    >
                      <option value="question">{t('portal.replies.kind.question')}</option>
                      <option value="objection">{t('portal.replies.kind.objection')}</option>
                      <option value="comment">{t('portal.replies.kind.comment')}</option>
                    </select>
                  </div>

                  {parentComment && (
                    <p className="text-xs font-medium text-ink-light">
                      {t('portal.replies.replyToMentor', {
                        date: formatCommentDate(language, parentComment.created_at),
                      })}
                    </p>
                  )}

                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-${item.item_id}-body`}
                      className="sr-only"
                    >
                      {t('portal.replies.form.bodyLabel')}
                    </label>
                    <textarea
                      id={`${formIdPrefix}-${item.item_id}-body`}
                      value={formState.body}
                      onChange={(e) =>
                        setFormState((prev) =>
                          prev ? { ...prev, body: e.target.value } : null,
                        )
                      }
                      placeholder={t('portal.replies.form.placeholder')}
                      rows={3}
                      className="input text-xs"
                      aria-describedby={
                        formState.error
                          ? `${counterId} ${errorId}`
                          : counterId
                      }
                      aria-invalid={
                        Boolean(formState.error) ||
                        noteLength(formState.body) > DEFAULT_COMMENT_MAX_CHARS ||
                        undefined
                      }
                    />

                    <div
                      id={counterId}
                      className={`mt-1 flex flex-wrap items-center justify-between gap-2 text-xs ${
                        noteLength(formState.body) > DEFAULT_COMMENT_MAX_CHARS
                          ? 'text-coral'
                          : 'text-ink-muted'
                      }`}
                    >
                      <span>
                        {noteLength(formState.body) > DEFAULT_COMMENT_MAX_CHARS &&
                          replyCodePhrase(
                            'comment_too_long',
                            { max: DEFAULT_COMMENT_MAX_CHARS },
                            language,
                          )}
                      </span>
                      <span className="tabular-nums ml-auto">
                        {formatCount(noteLength(formState.body))} /{' '}
                        {formatCount(DEFAULT_COMMENT_MAX_CHARS)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-ink-muted">
                    {t('portal.replies.form.countProgress', {
                      count: String(studentRepliesCount),
                      limit: String(DEFAULT_COMMENT_LIMIT),
                    })}
                  </div>

                  {formState.error && (
                    <div
                      id={errorId}
                      role="alert"
                      className="text-xs text-coral bg-coral-pale/50 p-2 rounded"
                    >
                      {formState.error}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={
                        !canReply ||
                        noteLength(formState.body) === 0 ||
                        noteLength(formState.body) > DEFAULT_COMMENT_MAX_CHARS ||
                        formState.submitting
                      }
                      className="btn-primary btn-sm text-xs flex items-center gap-1.5"
                    >
                      {formState.submitting && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      {t('portal.replies.form.submit')}
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      disabled={formState.submitting}
                      className="btn-ghost btn-sm text-xs"
                    >
                      {t('portal.replies.form.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
