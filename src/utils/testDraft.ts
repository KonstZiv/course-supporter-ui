import type {
  WrittenTestBody,
  WrittenTestCheck,
  WrittenTestIncompletePlace,
  WrittenTestResponse,
} from '../types/api'
import { MAX_OPTIONS } from './testLetters'

/**
 * The test the editor holds while the author works on it (task 07c,
 * PRE-FLIGHT §15.3).
 *
 * The page keeps two things: ``saved``, the server's last answer, and the
 * draft here, what the author has typed since. Every function is pure and
 * returns a new draft; the page sends ``draftBody`` of it and asks
 * ``hasUnsavedChanges`` whether there is anything to send. Positions
 * (``question``, ``option``) count from 1 in the draft's current order — the
 * order of the body sent, which is how the server counts them too.
 *
 * The rules here mirror the backend's for marks shown before a save: what is
 * unfinished (``homework/test_completeness.py``) and the limits of the format
 * (``homework/test_yaml.py``). The server stays the authority (questions
 * 23.8, 23.9): after a save the page shows what its answer says.
 */

export interface DraftOption {
  /** Tells the option apart across edits and moves; never sent. */
  key: string
  text: string
  correct: boolean
}

export interface DraftQuestion {
  key: string
  /**
   * The question's number in the saved draft — the key of the check's
   * explanations and doubts of it — or null for a question added since. A
   * moved card keeps it, and so its explanation.
   */
  savedNumber: string | null
  text: string
  options: DraftOption[]
  /** The author's own explanation; null while none is opened. */
  explanation: string | null
}

export interface TestDraft {
  title: string
  /** The pass mark as typed; '' for none. */
  passThreshold: string
  questions: DraftQuestion[]
}

/** The format's limits (backend ``homework/test_yaml.py``, PRE-FLIGHT §5.1). */
export const TEST_LIMITS = {
  titleChars: 200,
  questions: 200,
  options: MAX_OPTIONS,
  questionChars: 2_000,
  optionChars: 500,
  explanationChars: 2_000,
  passThreshold: { min: 1, max: 100 },
  yamlFileBytes: 256 * 1024,
} as const

/** The fewest options a finished question has: one option is no choice. */
export const MIN_OPTIONS = 2

// Keys only tell cards apart while the page lives, so a counter is enough.
let lastKey = 0
function newKey(): string {
  lastKey += 1
  return `k${lastKey}`
}

/** A new test: no title, no pass mark, no questions. */
export function emptyDraft(): TestDraft {
  return { title: '', passThreshold: '', questions: [] }
}

/** The draft of the server's answer, each question and option with a new key. */
export function draftFromServer(test: WrittenTestResponse): TestDraft {
  const { pass_threshold: passThreshold, questions } = test.draft
  return {
    title: test.title ?? '',
    passThreshold: passThreshold === null ? '' : String(passThreshold),
    questions: questions.map((question) => ({
      key: newKey(),
      savedNumber: question.number,
      text: question.text,
      options: question.options.map((option) => ({
        key: newKey(),
        text: option.text,
        correct: option.correct,
      })),
      explanation: question.explanation,
    })),
  }
}

/**
 * The draft after the server answered a save of ``sent``.
 *
 * When the author has typed nothing since (``local`` still has ``sent``'s
 * body), it is the answer — texts as the server trimmed them — with the keys
 * of ``sent`` kept by position, so no card is remounted and focus stays where
 * it was. Otherwise ``local`` stays the author's; only the saved numbers move
 * to the answer's, which numbers the questions of ``sent`` in its order.
 */
export function draftAfterSave(
  local: TestDraft,
  sent: TestDraft,
  answer: WrittenTestResponse,
): TestDraft {
  if (hasUnsavedChanges(local, sent)) {
    const numbers = new Map(
      sent.questions.map((question, index) => [
        question.key,
        answer.draft.questions[index]?.number ?? null,
      ]),
    )
    return {
      ...local,
      questions: local.questions.map((question) => ({
        ...question,
        savedNumber: numbers.get(question.key) ?? null,
      })),
    }
  }
  const fresh = draftFromServer(answer)
  return {
    ...fresh,
    questions: fresh.questions.map((question, index) => {
      const before = sent.questions[index]
      return {
        ...question,
        key: before?.key ?? question.key,
        options: question.options.map((option, position) => ({
          ...option,
          key: before?.options[position]?.key ?? option.key,
        })),
      }
    }),
  }
}

/** The pass mark as typed, read: a number, none, or one the route refuses. */
export function passThresholdValue(raw: string): number | null | 'invalid' {
  const typed = raw.trim()
  if (typed === '') return null
  if (!/^\d+$/.test(typed)) return 'invalid'
  const value = Number(typed)
  const { min, max } = TEST_LIMITS.passThreshold
  return value >= min && value <= max ? value : 'invalid'
}

/**
 * The body to send: texts trimmed, an empty own explanation and an unset
 * pass mark left out — the route refuses a null pass mark, and an empty
 * explanation is none. An invalid pass mark is left out too, so the page
 * sends a draft only when ``fieldProblems`` has nothing to say.
 */
export function draftBody(
  draft: TestDraft,
): WrittenTestBody & { title: string } {
  const passThreshold = passThresholdValue(draft.passThreshold)
  return {
    title: draft.title.trim(),
    ...(typeof passThreshold === 'number'
      ? { pass_threshold: passThreshold }
      : {}),
    questions: draft.questions.map((question) => {
      const explanation = question.explanation?.trim()
      return {
        text: question.text.trim(),
        options: question.options.map((option) => ({
          text: option.text.trim(),
          correct: option.correct,
        })),
        ...(explanation ? { explanation } : {}),
      }
    }),
  }
}

/**
 * Whether saving ``local`` would change ``saved`` — their bodies compared, so
 * a move there and back, or spaces a save would trim, is no change. A pass
 * mark the route would not take is one: saving it is how the author learns
 * why.
 */
export function hasUnsavedChanges(local: TestDraft, saved: TestDraft): boolean {
  return comparable(local) !== comparable(saved)
}

function comparable(draft: TestDraft): string {
  const passThreshold = passThresholdValue(draft.passThreshold)
  return JSON.stringify([
    draftBody(draft),
    passThreshold === 'invalid' ? draft.passThreshold.trim() : null,
  ])
}

/**
 * Every unfinished place, in the order the author reads the cards — the
 * backend's rules (``incomplete_places``): no questions; an empty question or
 * option text; fewer than two options; options with none marked right. A
 * question with no options is only short of options.
 */
export function incompletePlaces(
  draft: TestDraft,
): WrittenTestIncompletePlace[] {
  if (draft.questions.length === 0) {
    return [{ code: 'TEST_NO_QUESTIONS', question: null, option: null }]
  }
  const places: WrittenTestIncompletePlace[] = []
  draft.questions.forEach((question, index) => {
    const number = index + 1
    if (!question.text.trim()) {
      places.push({ code: 'TEST_TEXT_EMPTY', question: number, option: null })
    }
    question.options.forEach((option, position) => {
      if (!option.text.trim()) {
        places.push({
          code: 'TEST_TEXT_EMPTY',
          question: number,
          option: position + 1,
        })
      }
    })
    if (question.options.length < MIN_OPTIONS) {
      places.push({ code: 'TEST_OPTIONS_COUNT', question: number, option: null })
    }
    const marked = question.options.some((option) => option.correct)
    if (question.options.length > 0 && !marked) {
      places.push({
        code: 'TEST_NO_CORRECT_OPTION',
        question: number,
        option: null,
      })
    }
  })
  return places
}

/** What a field breaks of the format, found before a request (§15.6). */
export type FieldProblem =
  | { field: 'title'; kind: 'empty' | 'too_long' }
  | { field: 'pass_threshold'; kind: 'invalid' }
  | { field: 'question'; questionKey: string; kind: 'too_long' }
  | {
      field: 'option'
      questionKey: string
      optionKey: string
      kind: 'too_long'
    }
  | { field: 'explanation'; questionKey: string; kind: 'too_long' }

// The route counts characters as Python's len does — code points, not the
// UTF-16 units of String.length, which count an emoji twice — once trimmed.
function chars(text: string): number {
  return Array.from(text.trim()).length
}

/** Every field the route would refuse as it stands, in the page's order. */
export function fieldProblems(draft: TestDraft): FieldProblem[] {
  const problems: FieldProblem[] = []
  if (!draft.title.trim()) {
    problems.push({ field: 'title', kind: 'empty' })
  } else if (chars(draft.title) > TEST_LIMITS.titleChars) {
    problems.push({ field: 'title', kind: 'too_long' })
  }
  if (passThresholdValue(draft.passThreshold) === 'invalid') {
    problems.push({ field: 'pass_threshold', kind: 'invalid' })
  }
  for (const question of draft.questions) {
    const questionKey = question.key
    if (chars(question.text) > TEST_LIMITS.questionChars) {
      problems.push({ field: 'question', questionKey, kind: 'too_long' })
    }
    for (const option of question.options) {
      if (chars(option.text) > TEST_LIMITS.optionChars) {
        problems.push({
          field: 'option',
          questionKey,
          optionKey: option.key,
          kind: 'too_long',
        })
      }
    }
    const explanation = question.explanation ?? ''
    if (chars(explanation) > TEST_LIMITS.explanationChars) {
      problems.push({ field: 'explanation', questionKey, kind: 'too_long' })
    }
  }
  return problems
}

export function canAddQuestion(draft: TestDraft): boolean {
  return draft.questions.length < TEST_LIMITS.questions
}

export function canAddOption(question: DraftQuestion): boolean {
  return question.options.length < TEST_LIMITS.options
}

/** Why a file cannot replace the draft, found before it is sent; or null. */
export function yamlFileProblem(file: {
  name: string
  size: number
}): 'not_yaml' | 'too_large' | null {
  if (!/\.ya?ml$/i.test(file.name)) return 'not_yaml'
  return file.size > TEST_LIMITS.yamlFileBytes ? 'too_large' : null
}

/**
 * The model's explanation of a card and whether it doubts the card's marks —
 * read by the card's saved number, and only from a check that is ready.
 */
export function modelNote(
  check: WrittenTestCheck,
  question: DraftQuestion,
): { explanation: string | null; doubt: boolean } {
  if (check.state !== 'ready' || question.savedNumber === null) {
    return { explanation: null, doubt: false }
  }
  return {
    explanation: check.explanations[question.savedNumber] ?? null,
    doubt: check.doubts[question.savedNumber] === true,
  }
}

// ── Actions: each returns a new draft; the one it was given stays as it was.

export function setSettings(
  draft: TestDraft,
  patch: Partial<Pick<TestDraft, 'title' | 'passThreshold'>>,
): TestDraft {
  return { ...draft, ...patch }
}

/** A new empty question at the end, with no options yet; none past 200. */
export function addQuestion(draft: TestDraft): TestDraft {
  if (!canAddQuestion(draft)) return draft
  const question: DraftQuestion = {
    key: newKey(),
    savedNumber: null,
    text: '',
    options: [],
    explanation: null,
  }
  return { ...draft, questions: [...draft.questions, question] }
}

export function removeQuestion(
  draft: TestDraft,
  questionKey: string,
): TestDraft {
  return {
    ...draft,
    questions: draft.questions.filter(
      (question) => question.key !== questionKey,
    ),
  }
}

/** One place up or down; the first does not go up, nor the last down. */
export function moveQuestion(
  draft: TestDraft,
  questionKey: string,
  direction: 'up' | 'down',
): TestDraft {
  return { ...draft, questions: moved(draft.questions, questionKey, direction) }
}

/** The text of a question, or its own explanation — null closes it. */
export function setQuestion(
  draft: TestDraft,
  questionKey: string,
  patch: Partial<Pick<DraftQuestion, 'text' | 'explanation'>>,
): TestDraft {
  return withQuestion(draft, questionKey, (question) => ({
    ...question,
    ...patch,
  }))
}

/** A new empty option at the end of its question, unmarked; none past 26. */
export function addOption(draft: TestDraft, questionKey: string): TestDraft {
  return withQuestion(draft, questionKey, (question) => {
    if (!canAddOption(question)) return question
    const option: DraftOption = { key: newKey(), text: '', correct: false }
    return { ...question, options: [...question.options, option] }
  })
}

export function removeOption(
  draft: TestDraft,
  questionKey: string,
  optionKey: string,
): TestDraft {
  return withQuestion(draft, questionKey, (question) => ({
    ...question,
    options: question.options.filter((option) => option.key !== optionKey),
  }))
}

/** One place up or down within its question; never past either end. */
export function moveOption(
  draft: TestDraft,
  questionKey: string,
  optionKey: string,
  direction: 'up' | 'down',
): TestDraft {
  return withQuestion(draft, questionKey, (question) => ({
    ...question,
    options: moved(question.options, optionKey, direction),
  }))
}

export function setOption(
  draft: TestDraft,
  questionKey: string,
  optionKey: string,
  patch: Partial<Pick<DraftOption, 'text' | 'correct'>>,
): TestDraft {
  return withQuestion(draft, questionKey, (question) => ({
    ...question,
    options: question.options.map((option) =>
      option.key === optionKey ? { ...option, ...patch } : option,
    ),
  }))
}

function withQuestion(
  draft: TestDraft,
  questionKey: string,
  change: (question: DraftQuestion) => DraftQuestion,
): TestDraft {
  return {
    ...draft,
    questions: draft.questions.map((question) =>
      question.key === questionKey ? change(question) : question,
    ),
  }
}

function moved<T extends { key: string }>(
  items: T[],
  key: string,
  direction: 'up' | 'down',
): T[] {
  const from = items.findIndex((item) => item.key === key)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= items.length) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}
