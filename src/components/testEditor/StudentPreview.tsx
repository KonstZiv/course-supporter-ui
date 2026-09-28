import type { TestDraft } from '../../utils/testDraft'
import { TEXTS } from './editorTexts'

/**
 * The test as a student will see it once published — a copy of the portal
 * form's markup (``PortalTestForm``, decision Г): numbered questions, options
 * under their letters, boxes nobody can tick here, and nothing of the key —
 * no marks, no explanations. Unsaved changes show too, lettered in the
 * course's alphabet as a publication would letter them.
 */
export function StudentPreview({
  draft,
  letters,
}: {
  draft: TestDraft
  letters: string[]
}) {
  return (
    <div className="card p-6">
      <p className="text-sm text-ink-muted">{TEXTS.studentViewIntro}</p>
      <h2 className="font-display text-xl text-ink mt-4 break-words">
        {draft.title.trim()}
      </h2>
      {draft.questions.length === 0 ? (
        <p className="text-sm text-ink-muted italic mt-4">
          {TEXTS.studentViewEmpty}
        </p>
      ) : (
        <ol className="space-y-4 list-none p-0 mt-4">
          {draft.questions.map((question, number) => (
            <li key={question.key}>
              <fieldset>
                <legend className="text-sm font-medium text-ink whitespace-pre-wrap break-words">
                  {number + 1}. {question.text.trim()}
                </legend>
                <div className="mt-2 space-y-1.5">
                  {question.options.map((option, index) => (
                    <label
                      key={option.key}
                      className="flex items-start gap-2 text-sm text-ink-light"
                    >
                      <input type="checkbox" className="mt-0.5" disabled />
                      <span className="whitespace-pre-wrap break-words">
                        {letters[index] ?? index + 1}) {option.text.trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
