import { useId } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { DraftCheckState, WrittenTestResponse } from '../../types/api'
import type { TestAction } from '../../utils/testRefusals'
import { Chip, type Tone } from './Chip'
import { TEXTS } from './editorTexts'

const CHECK_CHIP: Record<DraftCheckState, { label: string; tone: Tone }> = {
  not_checked: { label: TEXTS.notChecked, tone: 'neutral' },
  in_progress: { label: TEXTS.checking, tone: 'amber' },
  ready: { label: TEXTS.checked, tone: 'forest' },
  failed: { label: TEXTS.checkFailed, tone: 'coral' },
}

/**
 * The editor's panel, kept under the header while the author scrolls: back
 * to the course, the test's name and what state it is in, the three actions
 * and the switch to the student's view — with why an action is unavailable
 * and what the last one did.
 */
export function EditorToolbar({
  title,
  backTo,
  saved,
  unsaved,
  busy,
  checkBlocked,
  publishBlocked,
  view,
  status,
  onSave,
  onCheck,
  onPublish,
  onView,
}: {
  title: string
  backTo: string
  saved: WrittenTestResponse | null
  unsaved: boolean
  busy: TestAction | null
  checkBlocked: string | null
  publishBlocked: string | null
  view: 'edit' | 'student'
  status: string | null
  onSave: () => void
  onCheck: () => void
  onPublish: () => void
  onView: (view: 'edit' | 'student') => void
}) {
  const hintId = useId()
  const checkHintId = `${hintId}-check`
  // One reason for both actions is said once, and both name that line.
  const publishHintId =
    publishBlocked !== null && publishBlocked === checkBlocked
      ? checkHintId
      : `${hintId}-publish`
  const saving = busy === 'save'
  const check = saved === null ? null : CHECK_CHIP[saved.check.state]

  return (
    <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-canvas-dark/40">
      <div className="max-w-3xl mx-auto px-6 py-3 space-y-2">
        {/* The name keeps room to be read; the state chips move under it when
            they do not fit beside it. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Link
            to={backTo}
            aria-label={TEXTS.back}
            title={TEXTS.back}
            className="p-2 rounded-lg hover:bg-canvas-dark transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
          >
            <ArrowLeft size={18} className="text-ink-muted" />
          </Link>
          <h1 className="font-display text-xl text-ink min-w-0 flex-1 basis-60 truncate">
            {title}
          </h1>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            {saved === null ? (
              <Chip tone="neutral">{TEXTS.newTest}</Chip>
            ) : saved.published === null ? (
              <Chip tone="neutral">{TEXTS.notPublished}</Chip>
            ) : (
              <>
                <Chip tone="forest" title={TEXTS.publishedHint}>
                  {TEXTS.published}
                </Chip>
                {saved.unpublished_changes && (
                  <Chip tone="navy" title={TEXTS.unpublishedChangesHint}>
                    {TEXTS.unpublishedChanges}
                  </Chip>
                )}
              </>
            )}
            {check && (
              <Chip
                tone={check.tone}
                pulse={saved?.check.state === 'in_progress'}
              >
                {check.label}
              </Chip>
            )}
            {saving ? (
              <Chip tone="amber">
                <Loader2 size={12} className="animate-spin" />
                {TEXTS.saving}
              </Chip>
            ) : unsaved ? (
              <Chip tone="amber">{TEXTS.unsaved}</Chip>
            ) : (
              saved !== null && (
                <span className="text-xs text-ink-muted whitespace-nowrap">
                  {TEXTS.allSaved}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={onSave}
            disabled={busy !== null || !unsaved}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? TEXTS.saving : unsaved ? TEXTS.save : TEXTS.nothingToSave}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onCheck}
            disabled={busy !== null || checkBlocked !== null}
            aria-describedby={checkBlocked !== null ? checkHintId : undefined}
          >
            {busy === 'check' && <Loader2 size={14} className="animate-spin" />}
            {busy === 'check' ? TEXTS.ordering : TEXTS.check}
          </button>
          <button
            type="button"
            className="btn-accent btn-sm"
            onClick={onPublish}
            disabled={busy !== null || publishBlocked !== null}
            aria-describedby={publishBlocked !== null ? publishHintId : undefined}
          >
            {busy === 'publish' && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {busy === 'publish' ? TEXTS.publishing : TEXTS.publish}
          </button>
          <div className="ml-auto flex items-center gap-1">
            {(['edit', 'student'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={view === mode}
                onClick={() => onView(mode)}
                className={clsx(
                  'btn-ghost btn-sm',
                  view === mode && 'bg-navy-pale text-navy hover:bg-navy-pale',
                )}
              >
                {mode === 'edit' ? TEXTS.editView : TEXTS.studentView}
              </button>
            ))}
          </div>
        </div>

        {checkBlocked !== null && (
          <p id={checkHintId} className="text-xs text-ink-muted">
            {checkBlocked}
          </p>
        )}
        {publishBlocked !== null && publishHintId !== checkHintId && (
          <p id={publishHintId} className="text-xs text-ink-muted">
            {publishBlocked}
          </p>
        )}
        <p aria-live="polite" className="text-sm text-ink-light">
          {status}
        </p>
      </div>
    </div>
  )
}
