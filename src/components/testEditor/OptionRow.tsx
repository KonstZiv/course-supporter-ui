import { memo } from 'react'
import { clsx } from 'clsx'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { DraftOption } from '../../utils/testDraft'
import {
  correctLabel,
  moveOptionLabel,
  optionTextLabel,
  removeOptionLabel,
  TEXTS,
} from './editorTexts'
import { FieldError, IconButton, UnfinishedMark } from './fields'
import { describedBy, TEXTAREA } from './formParts'

/** An option of a question: its letter, its mark, its text and its moves. */
export const OptionRow = memo(function OptionRow({
  option,
  letter,
  fieldId,
  isFirst,
  isLast,
  error,
  unfinished,
  onText,
  onCorrect,
  onMove,
  onRemove,
}: {
  option: DraftOption
  letter: string
  /** The id stem of this option's controls, unique on the page. */
  fieldId: string
  isFirst: boolean
  isLast: boolean
  error: string | null
  unfinished: string | null
  onText: (text: string) => void
  onCorrect: (correct: boolean) => void
  onMove: (direction: 'up' | 'down') => void
  onRemove: () => void
}) {
  const errorId = `${fieldId}-error`
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="w-6 shrink-0 pt-3 text-right text-sm font-medium text-ink-muted"
      >
        {letter})
      </span>
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 pt-3.5 text-xs text-ink-muted">
        <input
          id={`${fieldId}-correct`}
          type="checkbox"
          checked={option.correct}
          onChange={(event) => onCorrect(event.target.checked)}
          aria-label={correctLabel(letter)}
          className="h-4 w-4 accent-navy rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
        />
        {TEXTS.correct}
      </label>
      <div className="min-w-0 flex-1">
        <textarea
          id={`${fieldId}-text`}
          rows={1}
          className={clsx(TEXTAREA, 'py-2 min-h-[46px]', error && 'border-coral')}
          value={option.text}
          onChange={(event) => onText(event.target.value)}
          aria-label={optionTextLabel(letter)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error && errorId)}
        />
        {error && <FieldError id={errorId} words={error} />}
        {unfinished && <UnfinishedMark words={unfinished} />}
      </div>
      <div className="flex shrink-0 items-center pt-1.5">
        <IconButton
          id={`${fieldId}-up`}
          icon={ArrowUp}
          label={moveOptionLabel(letter, true)}
          disabled={isFirst}
          onClick={() => onMove('up')}
        />
        <IconButton
          id={`${fieldId}-down`}
          icon={ArrowDown}
          label={moveOptionLabel(letter, false)}
          disabled={isLast}
          onClick={() => onMove('down')}
        />
        <IconButton
          id={`${fieldId}-remove`}
          icon={Trash2}
          label={removeOptionLabel(letter)}
          danger
          onClick={onRemove}
        />
      </div>
    </li>
  )
})
