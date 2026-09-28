import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, ListChecks, Loader2, Plus } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/testEditor/ConfirmDialog'
import { EditorToolbar } from '../components/testEditor/EditorToolbar'
import {
  hideText,
  replaceOwnText,
  replaceYamlText,
  TEXTS,
} from '../components/testEditor/editorTexts'
import { cardIds } from '../components/testEditor/formParts'
import { PublishDialog } from '../components/testEditor/PublishDialog'
import {
  QuestionCard,
  type CardActions,
} from '../components/testEditor/QuestionCard'
import { SettingsCard } from '../components/testEditor/SettingsCard'
import { StudentPreview } from '../components/testEditor/StudentPreview'
import {
  useTestEditor,
  type EditorAddress,
} from '../components/testEditor/useTestEditor'
import { useLeaveGuard } from '../hooks/useLeaveGuard'
import {
  addOption,
  addQuestion,
  canAddQuestion,
  changesCheckedContent,
  modelNote,
  moveOption,
  moveQuestion,
  removeOption,
  removeQuestion,
  setOption,
  setQuestion,
  setSettings,
  yamlFileProblem,
  type TestDraft,
} from '../utils/testDraft'
import { optionLetters } from '../utils/testLetters'
import {
  BACK_TO_COURSES,
  fieldProblemWords,
  yamlFileProblemWords,
} from '../utils/testRefusals'

/**
 * The test editor (task 07c, decisions 1–10; PRE-FLIGHT §15): a test written
 * in the system, made and changed without YAML — at ``/test/:documentId/edit``
 * for a test there is, at ``/test/new?node=…&course=…`` for a new one.
 */
export function TestEditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const address: EditorAddress =
    documentId !== undefined
      ? { documentId }
      : { nodeId: params.get('node'), courseId: params.get('course') }
  const editor = useTestEditor(address)
  const { blocker, allowNextMove } = useLeaveGuard(editor.unsaved)

  const [view, setView] = useState<'edit' | 'student'>('edit')
  const [publishing, setPublishing] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [yamlFile, setYamlFile] = useState<File | null>(null)
  const [takeFor, setTakeFor] = useState<string | null>(null)

  const stem = useId()
  const body = useRef<HTMLDivElement>(null)
  const addQuestionId = `${stem}-add-question`
  const { update, draft, saved } = editor
  const draftRef = useRef(draft)
  draftRef.current = draft
  const savedRef = useRef(saved)
  savedRef.current = saved

  // Where focus goes once the render after an action is on screen: into a
  // field just added, onto the arrow that moved an item, next to what went.
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => {
    const id = pendingFocus.current
    if (id === null) return
    pendingFocus.current = null
    document.getElementById(id)?.focus()
  })

  // Errors shown: focus goes to the first field they name.
  useEffect(() => {
    if (editor.errorsShown === 0) return
    body.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus()
  }, [editor.errorsShown])

  const letters = useMemo(
    () => optionLetters(editor.language),
    [editor.language],
  )

  const change = useCallback(
    (next: TestDraft, focus: string | null = null) => {
      pendingFocus.current = focus
      update(() => next)
    },
    [update],
  )

  // The model's text becomes the author's own, to edit; the model's block
  // keeps its words (KD20).
  const applyModelText = useCallback(
    (key: string) => {
      const current = savedRef.current
      const question = draftRef.current.questions.find((q) => q.key === key)
      const text = current && question && modelNote(current.check, question)
      if (!question || !text?.explanation) return
      change(
        setQuestion(draftRef.current, key, { explanation: text.explanation }),
        cardIds(stem, key).own,
      )
    },
    [change, stem],
  )

  const actions: CardActions = useMemo(
    () => ({
      setText: (key, text) => update((d) => setQuestion(d, key, { text })),
      setOwn: (key, text) =>
        update((d) => setQuestion(d, key, { explanation: text })),
      openOwn: (key) =>
        change(
          setQuestion(draftRef.current, key, { explanation: '' }),
          cardIds(stem, key).own,
        ),
      closeOwn: (key) =>
        change(
          setQuestion(draftRef.current, key, { explanation: null }),
          cardIds(stem, key).openOwn,
        ),
      takeModelText: (key) => {
        const question = draftRef.current.questions.find((q) => q.key === key)
        // The author's own text would be lost: asked first.
        if (question?.explanation?.trim()) setTakeFor(key)
        else applyModelText(key)
      },
      move: (key, direction) => {
        const next = moveQuestion(draftRef.current, key, direction)
        const at = next.questions.findIndex((q) => q.key === key)
        const edge =
          direction === 'up' ? at === 0 : at === next.questions.length - 1
        const ids = cardIds(stem, key)
        change(next, (direction === 'up') !== edge ? ids.up : ids.down)
      },
      remove: (key) => {
        const before = draftRef.current.questions
        const at = before.findIndex((q) => q.key === key)
        const neighbour = before[at + 1] ?? before[at - 1]
        change(
          removeQuestion(draftRef.current, key),
          neighbour ? cardIds(stem, neighbour.key).text : addQuestionId,
        )
      },
      addOption: (key) => {
        const next = addOption(draftRef.current, key)
        const options = next.questions.find((q) => q.key === key)?.options
        const added = options?.[options.length - 1]
        change(next, added ? `${stem}-${added.key}-text` : null)
      },
      setOption: (key, optionKey, patch) =>
        update((d) => setOption(d, key, optionKey, patch)),
      moveOption: (key, optionKey, direction) => {
        const next = moveOption(draftRef.current, key, optionKey, direction)
        const options = next.questions.find((q) => q.key === key)?.options ?? []
        const at = options.findIndex((o) => o.key === optionKey)
        const edge = direction === 'up' ? at === 0 : at === options.length - 1
        change(
          next,
          `${stem}-${optionKey}-${(direction === 'up') !== edge ? 'up' : 'down'}`,
        )
      },
      removeOption: (key, optionKey) => {
        const options =
          draftRef.current.questions.find((q) => q.key === key)?.options ?? []
        const at = options.findIndex((o) => o.key === optionKey)
        const neighbour = options[at + 1] ?? options[at - 1]
        change(
          removeOption(draftRef.current, key, optionKey),
          neighbour
            ? `${stem}-${neighbour.key}-text`
            : cardIds(stem, key).addOption,
        )
      },
    }),
    [update, change, applyModelText, stem, addQuestionId],
  )

  const onAddQuestion = useCallback(() => {
    const next = addQuestion(draftRef.current)
    const added = next.questions[next.questions.length - 1]
    change(next, added ? cardIds(stem, added.key).text : null)
  }, [change, stem])

  async function save() {
    const created = await editor.save()
    if (created !== null) {
      allowNextMove()
      navigate(`/test/${created}/edit`, { replace: true })
    }
  }

  async function hide() {
    const hidden = await editor.hide()
    setHiding(false)
    if (hidden) {
      allowNextMove()
      navigate(editor.backTo)
    }
  }

  function chooseFile(file: File) {
    const problem = yamlFileProblem(file)
    if (problem !== null) editor.showBanner(yamlFileProblemWords(problem))
    else setYamlFile(file)
  }

  if (editor.loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    )
  }

  if (editor.openError !== null) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <div
          role="alert"
          className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {editor.openError}
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/')}
        >
          {BACK_TO_COURSES}
        </button>
      </div>
    )
  }

  const unfinished = editor.incomplete.length > 0
  const checkBlocked =
    saved === null
      ? TEXTS.saveTestFirst
      : editor.unsaved
        ? TEXTS.saveChangesFirst
        : unfinished
          ? TEXTS.finishFirst
          : saved.check.state === 'ready'
            ? TEXTS.alreadyChecked
            : null
  const publishBlocked =
    saved === null
      ? TEXTS.saveTestFirst
      : editor.unsaved
        ? TEXTS.saveChangesFirst
        : unfinished
          ? TEXTS.finishFirst
          : saved.published !== null && !saved.unpublished_changes
            ? TEXTS.nothingToPublish
            : null
  const titleProblem = editor.problems.find(
    (problem) =>
      problem.field === 'title' &&
      (problem.kind === 'too_long' || editor.attempted),
  )
  const passProblem = editor.problems.find(
    (problem) => problem.field === 'pass_threshold',
  )
  const changedSinceCheck =
    saved?.check.state === 'ready' &&
    changesCheckedContent(draft, editor.savedDraft)

  return (
    <>
      <EditorToolbar
        title={saved === null ? TEXTS.newTest : (saved.title ?? draft.title)}
        backTo={editor.backTo}
        saved={saved}
        unsaved={editor.unsaved}
        busy={editor.busy}
        checkBlocked={checkBlocked}
        publishBlocked={publishBlocked}
        view={view}
        status={editor.status}
        onSave={() => void save()}
        onCheck={() => void editor.check()}
        onPublish={() => setPublishing(true)}
        onView={setView}
      />

      {/* What takes focus scrolls clear of the header and the panel kept
          under it, which would otherwise cover it. */}
      <div
        ref={body}
        className="max-w-3xl mx-auto px-6 py-8 space-y-6 [&_button]:scroll-mt-60 [&_input]:scroll-mt-60 [&_textarea]:scroll-mt-60"
      >
        {editor.banner !== null && (
          <div
            role="alert"
            className="flex items-start gap-2 p-3 rounded-xl bg-coral-pale text-coral text-sm"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {editor.banner}
          </div>
        )}

        {view === 'student' ? (
          <StudentPreview draft={draft} letters={letters} />
        ) : (
          <>
            <SettingsCard
              title={draft.title}
              passThreshold={draft.passThreshold}
              titleError={titleProblem ? fieldProblemWords(titleProblem) : null}
              passThresholdError={
                passProblem ? fieldProblemWords(passProblem) : null
              }
              autoFocusTitle={saved === null}
              fileBlocked={saved === null ? TEXTS.saveTestFirst : null}
              exportBlocked={editor.unsaved ? TEXTS.saveChangesFirst : null}
              busy={editor.busy}
              onTitle={(title) => update((d) => setSettings(d, { title }))}
              onPassThreshold={(passThreshold) =>
                update((d) => setSettings(d, { passThreshold }))
              }
              onExport={() => void editor.exportYaml()}
              onChooseFile={chooseFile}
              onHide={() => setHiding(true)}
            />

            {changedSinceCheck && (
              <p className="rounded-lg bg-amber-pale p-3 text-sm text-amber-dark">
                {TEXTS.changedSinceCheck}
              </p>
            )}

            {draft.questions.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={ListChecks}
                  title={TEXTS.noQuestions}
                  description={TEXTS.noQuestionsHint}
                  action={
                    <button
                      id={addQuestionId}
                      type="button"
                      className="btn-primary"
                      onClick={onAddQuestion}
                    >
                      <Plus size={16} />
                      {TEXTS.addQuestion}
                    </button>
                  }
                />
              </div>
            ) : (
              <>
                {draft.questions.map((question, index) => {
                  const note =
                    saved === null
                      ? { explanation: null, doubt: false }
                      : modelNote(saved.check, question)
                  return (
                    <QuestionCard
                      key={question.key}
                      question={question}
                      number={index + 1}
                      isFirst={index === 0}
                      isLast={index === draft.questions.length - 1}
                      letters={letters}
                      stem={stem}
                      modelExplanation={note.explanation}
                      modelDoubt={note.doubt}
                      mark={
                        editor.serverMark?.questionKey === question.key
                          ? editor.serverMark
                          : null
                      }
                      actions={actions}
                    />
                  )
                })}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    id={addQuestionId}
                    type="button"
                    className="btn-secondary"
                    disabled={!canAddQuestion(draft)}
                    onClick={onAddQuestion}
                  >
                    <Plus size={16} />
                    {TEXTS.addQuestion}
                  </button>
                  {!canAddQuestion(draft) && (
                    <span className="text-xs text-ink-muted">
                      {TEXTS.tooManyQuestions}
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {saved !== null && (
        <PublishDialog
          open={publishing}
          firstPublication={saved.published === null}
          checkState={saved.check.state}
          busy={editor.busy === 'publish'}
          onCancel={() => setPublishing(false)}
          onConfirm={() => {
            setPublishing(false)
            void editor.publish()
          }}
        />
      )}

      <ConfirmDialog
        open={takeFor !== null}
        title={TEXTS.replaceOwnTitle}
        cancelLabel={TEXTS.cancel}
        confirmLabel={TEXTS.replace}
        onCancel={() => setTakeFor(null)}
        onConfirm={() => {
          const key = takeFor
          setTakeFor(null)
          if (key !== null) applyModelText(key)
        }}
      >
        <p>
          {replaceOwnText(
            draft.questions.findIndex((q) => q.key === takeFor) + 1,
          )}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={yamlFile !== null}
        title={TEXTS.replaceYamlTitle}
        cancelLabel={TEXTS.cancel}
        confirmLabel={TEXTS.replace}
        onCancel={() => setYamlFile(null)}
        onConfirm={() => {
          const file = yamlFile
          setYamlFile(null)
          if (file !== null) void editor.replaceWithYaml(file)
        }}
      >
        <p>{replaceYamlText(yamlFile?.name ?? '')}</p>
        {editor.unsaved && <p>{TEXTS.replaceYamlUnsaved}</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={hiding}
        title={TEXTS.hideTitle}
        cancelLabel={TEXTS.cancel}
        confirmLabel={TEXTS.hideConfirm}
        confirmClass="btn-danger"
        busy={editor.busy === 'hide'}
        onCancel={() => setHiding(false)}
        onConfirm={() => void hide()}
      >
        <p>{hideText(saved?.title ?? draft.title)}</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={TEXTS.leaveTitle}
        cancelLabel={TEXTS.stay}
        confirmLabel={TEXTS.leave}
        confirmClass="btn-danger"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        <p>{TEXTS.leaveText}</p>
      </ConfirmDialog>
    </>
  )
}
