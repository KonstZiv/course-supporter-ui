import { memo, useMemo } from 'react'
import { clsx } from 'clsx'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  canAddOption,
  questionPlaces,
  questionProblems,
  type DraftOption,
  type DraftQuestion,
} from '../../utils/testDraft'
import { fieldProblemWords, incompleteWords } from '../../utils/testRefusals'
import { Chip } from './Chip'
import {
  moveQuestionLabel,
  questionHeading,
  removeQuestionLabel,
  TEXTS,
} from './editorTexts'
import { FieldError, IconButton, UnfinishedMark } from './fields'
import { cardIds, describedBy, TEXTAREA } from './formParts'
import { ModelExplanation } from './ModelExplanation'
import { OptionRow } from './OptionRow'
import type { ServerMark } from './useTestEditor'

/** What a card can ask the page to do; stable, so a card left alone keeps its render. */
export interface CardActions {
  setText: (questionKey: string, text: string) => void
  openOwn: (questionKey: string) => void
  setOwn: (questionKey: string, text: string) => void
  closeOwn: (questionKey: string) => void
  takeModelText: (questionKey: string) => void
  move: (questionKey: string, direction: 'up' | 'down') => void
  remove: (questionKey: string) => void
  addOption: (questionKey: string) => void
  setOption: (
    questionKey: string,
    optionKey: string,
    patch: Partial<Pick<DraftOption, 'text' | 'correct'>>,
  ) => void
  moveOption: (
    questionKey: string,
    optionKey: string,
    direction: 'up' | 'down',
  ) => void
  removeOption: (questionKey: string, optionKey: string) => void
}

/**
 * A question of the draft: its text, its options with their marks, what is
 * unfinished or too long, what the model's check found, and the author's own
 * explanation. Memoized: typing in one card renders that card alone.
 */
export const QuestionCard = memo(function QuestionCard({
  question,
  number,
  isFirst,
  isLast,
  letters,
  stem,
  modelExplanation,
  modelDoubt,
  mark,
  actions,
}: {
  question: DraftQuestion
  number: number
  isFirst: boolean
  isLast: boolean
  letters: string[]
  stem: string
  modelExplanation: string | null
  modelDoubt: boolean
  mark: ServerMark | null
  actions: CardActions
}) {
  const key = question.key
  const ids = cardIds(stem, key)
  const places = useMemo(() => questionPlaces(question, number), [question, number])
  const problems = useMemo(() => questionProblems(question), [question])

  const textPlace = places.find(
    (place) => place.code === 'TEST_TEXT_EMPTY' && place.option === null,
  )
  const listPlaces = places.filter(
    (place) =>
      place.code === 'TEST_OPTIONS_COUNT' ||
      place.code === 'TEST_NO_CORRECT_OPTION',
  )
  const textProblem = problems.find((problem) => problem.field === 'question')
  const ownProblem = problems.find((problem) => problem.field === 'explanation')
  const cardMark = mark !== null && mark.optionKey === null ? mark.words : null
  const cardErrorId = `${ids.heading}-error`
  const textErrorId = `${ids.text}-error`
  const ownErrorId = `${ids.own}-error`
  const ownHintId = `${ids.own}-hint`

  return (
    <section
      aria-labelledby={ids.heading}
      className={clsx('card p-6', mark !== null && 'border-coral/40')}
    >
      <div className="flex items-center gap-2">
        <h2 id={ids.heading} className="font-display text-lg text-ink">
          {questionHeading(number)}
        </h2>
        {modelDoubt && <Chip tone="amber">{TEXTS.doubt}</Chip>}
        <div className="ml-auto flex items-center">
          <IconButton
            id={ids.up}
            icon={ArrowUp}
            label={moveQuestionLabel(number, true)}
            disabled={isFirst}
            onClick={() => actions.move(key, 'up')}
          />
          <IconButton
            id={ids.down}
            icon={ArrowDown}
            label={moveQuestionLabel(number, false)}
            disabled={isLast}
            onClick={() => actions.move(key, 'down')}
          />
          <IconButton
            id={ids.remove}
            icon={Trash2}
            label={removeQuestionLabel(number)}
            danger
            onClick={() => actions.remove(key)}
          />
        </div>
      </div>
      {cardMark !== null && <FieldError id={cardErrorId} words={cardMark} />}

      <div className="mt-4">
        <label
          htmlFor={ids.text}
          className="block text-sm font-medium text-ink mb-1.5"
        >
          {TEXTS.questionText}
        </label>
        <textarea
          id={ids.text}
          rows={2}
          className={clsx(
            TEXTAREA,
            'min-h-[72px]',
            (textProblem || cardMark) && 'border-coral',
          )}
          value={question.text}
          onChange={(event) => actions.setText(key, event.target.value)}
          aria-invalid={textProblem || cardMark ? true : undefined}
          aria-describedby={describedBy(
            textProblem && textErrorId,
            cardMark !== null && cardErrorId,
          )}
        />
        {textProblem && (
          <FieldError id={textErrorId} words={fieldProblemWords(textProblem)} />
        )}
        {textPlace && <UnfinishedMark words={incompleteWords(textPlace)} />}
      </div>

      <fieldset className="mt-5">
        <legend className="block text-sm font-medium text-ink mb-2">
          {TEXTS.options}
        </legend>
        {question.options.length === 0 ? (
          <p className="text-sm text-ink-muted italic">{TEXTS.noOptions}</p>
        ) : (
          <ul className="space-y-2">
            {question.options.map((option, index) => {
              const letter = letters[index] ?? String(index + 1)
              const problem = problems.find(
                (p) => p.field === 'option' && p.optionKey === option.key,
              )
              const unfinished = places.find(
                (place) =>
                  place.code === 'TEST_TEXT_EMPTY' && place.option === index + 1,
              )
              return (
                <OptionRow
                  key={option.key}
                  option={option}
                  letter={letter}
                  fieldId={`${stem}-${option.key}`}
                  isFirst={index === 0}
                  isLast={index === question.options.length - 1}
                  error={
                    problem
                      ? fieldProblemWords(problem)
                      : mark?.optionKey === option.key
                        ? mark.words
                        : null
                  }
                  unfinished={unfinished ? incompleteWords(unfinished) : null}
                  onText={(text) => actions.setOption(key, option.key, { text })}
                  onCorrect={(correct) =>
                    actions.setOption(key, option.key, { correct })
                  }
                  onMove={(direction) =>
                    actions.moveOption(key, option.key, direction)
                  }
                  onRemove={() => actions.removeOption(key, option.key)}
                />
              )
            })}
          </ul>
        )}
        {listPlaces.map((place) => (
          <UnfinishedMark key={place.code} words={incompleteWords(place)} />
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            id={ids.addOption}
            type="button"
            className="btn-secondary btn-sm"
            disabled={!canAddOption(question)}
            onClick={() => actions.addOption(key)}
          >
            <Plus size={14} />
            {TEXTS.addOption}
          </button>
          {!canAddOption(question) && (
            <span className="text-xs text-ink-muted">{TEXTS.tooManyOptions}</span>
          )}
        </div>
      </fieldset>

      {(modelExplanation !== null || modelDoubt) && (
        <div className="mt-5">
          <ModelExplanation
            explanation={modelExplanation}
            doubt={modelDoubt}
            onTake={() => actions.takeModelText(key)}
          />
        </div>
      )}

      <div className="mt-5">
        {question.explanation === null ? (
          <button
            id={ids.openOwn}
            type="button"
            className="btn-ghost btn-sm -ml-2"
            onClick={() => actions.openOwn(key)}
          >
            <Plus size={14} />
            {TEXTS.addOwnExplanation}
          </button>
        ) : (
          <div>
            <label
              htmlFor={ids.own}
              className="block text-sm font-medium text-ink mb-1.5"
            >
              {TEXTS.ownExplanation}
            </label>
            <textarea
              id={ids.own}
              rows={2}
              className={clsx(TEXTAREA, 'min-h-[72px]', ownProblem && 'border-coral')}
              value={question.explanation}
              onChange={(event) => actions.setOwn(key, event.target.value)}
              aria-invalid={ownProblem ? true : undefined}
              aria-describedby={describedBy(
                ownProblem && ownErrorId,
                ownHintId,
              )}
            />
            {ownProblem && (
              <FieldError id={ownErrorId} words={fieldProblemWords(ownProblem)} />
            )}
            <p id={ownHintId} className="text-xs text-ink-muted mt-1">
              {TEXTS.ownExplanationHint}
            </p>
            <button
              type="button"
              className="btn-ghost btn-sm mt-1 -ml-2"
              onClick={() => actions.closeOwn(key)}
            >
              {TEXTS.removeOwnExplanation}
            </button>
          </div>
        )}
      </div>
    </section>
  )
})
