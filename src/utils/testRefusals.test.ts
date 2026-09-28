import { describe, it, expect } from 'vitest'
import { ApiError } from '../api/client'
import type { TestRefusal } from '../types/api'
import { ingestErrorMessage } from './ingestErrors'
import type { FieldProblem, TestDraft } from './testDraft'
import {
  actionFailure,
  fieldProblemWords,
  incompleteWords,
  NOT_SAVED_SEE_BELOW,
  openingFailure,
  placeInDraft,
  yamlFileProblemWords,
  yamlFileRefusalWords,
  type TestAction,
} from './testRefusals'

// A refusal as client.ts keeps it: FastAPI's envelope around the coded body.
function refused(status: number, detail: Record<string, unknown>): ApiError {
  return new ApiError(status, `API error ${status}`, { detail })
}

const NOWHERE = { line: null, column: null, question: null, option: null }

// A refusal of the format as the wire carries it: its code, the developer's
// details and its place — nothing else.
function formatBody(
  code: string,
  place: TestRefusal['place'] = NOWHERE,
): Record<string, unknown> {
  return { code, details: 'for the developer', place }
}

// The same refusal read by ``testRefusal``.
function coded(
  code: string,
  place: TestRefusal['place'] = NOWHERE,
): TestRefusal {
  return {
    code,
    details: 'for the developer',
    place,
    incomplete: null,
    category: null,
  }
}

// What an action says when the server gave no reason — the words a code
// without its own would fall to.
function noReason(action: TestAction): string {
  return actionFailure(action, new TypeError('Failed to fetch')).banner
}

// Every code a test's routes and a YAML file's upload answer with, written
// out by hand — never derived from the module's tables, or they would agree
// by construction. The format's codes are the backend's DraftRefusalCode.
const FILE_CODES = [
  'TEST_YAML_UNREADABLE',
  'TEST_YAML_DUPLICATE_KEY',
  'TEST_YAML_ALIAS',
  'TEST_FIELD_INVALID',
  'TEST_OPTIONS_COUNT',
  'TEST_TOO_LARGE',
  'TEST_FILE_NOT_YAML',
]
const UNFINISHED_PLACES = [
  { code: 'TEST_NO_QUESTIONS', question: null, option: null },
  { code: 'TEST_TEXT_EMPTY', question: 1, option: null },
  { code: 'TEST_TEXT_EMPTY', question: 1, option: 2 },
  { code: 'TEST_OPTIONS_COUNT', question: 1, option: null },
  { code: 'TEST_NO_CORRECT_OPTION', question: 1, option: null },
] as const
const FIELD_PROBLEMS: FieldProblem[] = [
  { field: 'title', kind: 'empty' },
  { field: 'title', kind: 'too_long' },
  { field: 'pass_threshold', kind: 'invalid' },
  { field: 'question', questionKey: 'q', kind: 'too_long' },
  { field: 'option', questionKey: 'q', optionKey: 'o', kind: 'too_long' },
  { field: 'explanation', questionKey: 'q', kind: 'too_long' },
]

function ownWords(words: string | null | undefined, code: string): string {
  expect(words, code).toBeTruthy()
  expect(words, code).not.toContain(code)
  return words as string
}

describe('testRefusals', () => {
  it('words every refusal of a test for the author', () => {
    // A YAML file's refusals: each its own reason.
    const fileWords = FILE_CODES.map((code) =>
      ownWords(yamlFileRefusalWords(coded(code)), code),
    )
    expect(new Set(fileWords).size).toBe(FILE_CODES.length)

    // A save: at the question or option, or at the top.
    const at = actionFailure(
      'save',
      refused(
        422,
        formatBody('TEST_FIELD_INVALID', { ...NOWHERE, question: 2 }),
      ),
    )
    expect(at.banner).toBe(NOT_SAVED_SEE_BELOW)
    ownWords(at.at?.words, 'TEST_FIELD_INVALID')
    const tooMany = actionFailure(
      'save',
      refused(
        422,
        formatBody('TEST_OPTIONS_COUNT', { ...NOWHERE, question: 1 }),
      ),
    )
    ownWords(tooMany.at?.words, 'TEST_OPTIONS_COUNT')
    expect(tooMany.at?.words).not.toBe(at.at?.words)
    const saveBanners = [
      refused(422, formatBody('TEST_FIELD_INVALID')),
      refused(413, formatBody('TEST_TOO_LARGE')),
      ...['suspicious_unicode', 'prompt_injection', 'charset_violation'].map(
        (category) =>
          refused(400, {
            code: 'SECURITY_REJECTED',
            category,
            details: 'zero_width U+200B at index 4',
          }),
      ),
    ].map((error) => actionFailure('save', error).banner)
    expect(new Set([...saveBanners, noReason('save')]).size).toBe(6)

    // A collision: what it stopped, in its own words.
    const collision = refused(409, {
      code: 'GENERATION_IN_PROGRESS',
      details: 'another job of this task is still running',
    })
    const checking = actionFailure('check', collision).banner
    const publishing = actionFailure('publish', collision).banner
    expect(new Set([checking, publishing, noReason('check'), noReason('publish')]).size).toBe(4)

    // An unfinished draft: the banner, and every place it lists.
    const incomplete = [{ code: 'TEST_NO_CORRECT_OPTION', question: 2, option: null }]
    for (const action of ['check', 'publish'] as const) {
      const failure = actionFailure(
        action,
        refused(422, { code: 'TEST_DRAFT_INCOMPLETE', details: 'x', incomplete }),
      )
      expect(failure.banner).not.toBe(noReason(action))
      expect(failure.incomplete).toEqual(incomplete)
    }

    // Opening: gone, not a test, or no answer.
    const opening = [
      openingFailure(refused(404, { detail: 'Document not found' })),
      openingFailure(refused(422, { code: 'NOT_A_TEST_OBJECT', details: 'x' })),
      openingFailure(new TypeError('Failed to fetch')),
    ]
    expect(new Set(opening).size).toBe(3)

    // Unfinished places and fields checked before a request.
    const unfinished = UNFINISHED_PLACES.map((place) =>
      ownWords(incompleteWords(place), place.code),
    )
    expect(new Set(unfinished).size).toBe(UNFINISHED_PLACES.length)
    const fields = FIELD_PROBLEMS.map((problem) =>
      ownWords(fieldProblemWords(problem), problem.field),
    )
    expect(new Set(fields).size).toBe(FIELD_PROBLEMS.length)
    expect(yamlFileProblemWords('not_yaml')).not.toBe(
      yamlFileProblemWords('too_large'),
    )

    // With no reason, each action still says what failed and what to do.
    const actions: TestAction[] = ['save', 'check', 'publish', 'export', 'replace', 'hide']
    const plain = actions.map(noReason)
    expect(new Set(plain).size).toBe(actions.length)
    for (const words of plain) {
      expect(words).toContain("Перевірте з'єднання й спробуйте ще раз.")
    }
    expect(actionFailure('hide', refused(404, { detail: 'Document not found' })).banner).toBe(
      openingFailure(refused(404, { detail: 'Document not found' })),
    )
  })

  it('places a refusal on its question and option', () => {
    const sent: TestDraft = {
      title: 'Змінні',
      passThreshold: '',
      questions: [
        {
          key: 'q1',
          savedNumber: '1',
          text: 'Що?',
          options: [
            { key: 'q1o1', text: 'так', correct: true },
            { key: 'q1o2', text: 'ні', correct: false },
          ],
          explanation: null,
        },
        {
          key: 'q2',
          savedNumber: '2',
          text: 'Чому?',
          options: [
            { key: 'q2o1', text: 'бо', correct: true },
            { key: 'q2o2', text: '', correct: false },
          ],
          explanation: null,
        },
      ],
    }
    // The backend's own body for question 2, option 2 of the body sent.
    const failure = actionFailure(
      'save',
      refused(422, {
        code: 'TEST_FIELD_INVALID',
        details: 'question 2, option 2: text has 501 characters; at most 500',
        place: { line: null, column: null, question: 2, option: 2 },
      }),
    )

    expect(failure.at).toMatchObject({ question: 2, option: 2 })
    expect(placeInDraft(sent, failure.at!)).toEqual({
      questionKey: 'q2',
      optionKey: 'q2o2',
    })
    expect(placeInDraft(sent, { question: 1, option: null })).toEqual({
      questionKey: 'q1',
      optionKey: null,
    })
    expect(placeInDraft(sent, { question: null, option: null })).toBeNull()
    expect(placeInDraft(sent, { question: 3, option: null })).toBeNull()
  })

  it('words a YAML file refusal with its line and column', () => {
    // The backend's own refusal of a YAML file whose option names a field twice.
    const duplicate: TestRefusal = {
      code: 'TEST_YAML_DUPLICATE_KEY',
      details: "question 1, option 2: 'correct' is given twice",
      place: { line: 9, column: 9, question: 1, option: 2 },
      incomplete: null,
      category: null,
    }

    expect(yamlFileRefusalWords(duplicate)).toBe(
      'Файл не прочитано: одне поле записано двічі — лишіть один запис — ' +
        'рядок 9, стовпчик 9 (питання 1, варіант 2)',
    )
    expect(yamlFileRefusalWords(duplicate, 'змінні.yaml')).toBe(
      'змінні.yaml: тест не прочитано — одне поле записано двічі — лишіть ' +
        'один запис — рядок 9, стовпчик 9 (питання 1, варіант 2)',
    )
    expect(
      yamlFileRefusalWords(
        coded('TEST_YAML_UNREADABLE', { ...NOWHERE, line: 3, column: 1 }),
      ),
    ).toBe(
      'Файл не прочитано: файл не читається як YAML — перевірте відступи, ' +
        'двокрапки й лапки — рядок 3, стовпчик 1',
    )
    expect(yamlFileRefusalWords(coded('TEST_TOO_LARGE'))).toBe(
      'Файл не прочитано: файл завеликий: тест може мати до 256 КБ — ' +
        'скоротіть тексти чи розділіть тест',
    )
    // Replacing the draft from a file: the file's words, and a screened file
    // in the words every upload of a file gets.
    expect(
      actionFailure(
        'replace',
        refused(422, formatBody(duplicate.code, duplicate.place)),
      ).banner,
    ).toBe(yamlFileRefusalWords(duplicate))
    expect(
      actionFailure(
        'replace',
        refused(400, {
          code: 'SECURITY_REJECTED',
          category: 'suspicious_unicode',
          details: 'zero_width U+200B at index 4',
        }),
      ).banner,
    ).toBe(ingestErrorMessage('suspicious_unicode'))
    expect(yamlFileRefusalWords(coded('GENERATION_IN_PROGRESS'))).toBeNull()
  })
})
