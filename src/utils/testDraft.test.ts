import { describe, it, expect } from 'vitest'
import type {
  WrittenTestIncompletePlace,
  WrittenTestResponse,
} from '../types/api'
import { optionLetters } from './testLetters'
import {
  addOption,
  addQuestion,
  canAddOption,
  canAddQuestion,
  draftAfterSave,
  draftBody,
  draftFromServer,
  emptyDraft,
  fieldProblems,
  hasUnsavedChanges,
  incompletePlaces,
  modelNote,
  moveOption,
  moveQuestion,
  removeOption,
  removeQuestion,
  setOption,
  setQuestion,
  setSettings,
  TEST_LIMITS,
  yamlFileProblem,
  type TestDraft,
} from './testDraft'

interface BodyQuestion {
  text: string
  options: { text: string; correct: boolean }[]
  explanation?: string | null
}

// A reading of a saved draft as the server gives it: numbered from 1,
// lettered in the course's alphabet.
function reading(
  questions: BodyQuestion[],
  more: Partial<WrittenTestResponse> = {},
): WrittenTestResponse {
  const letters = optionLetters('ukr')
  return {
    id: 'test-1',
    course_node_id: 'node-1',
    title: 'Змінні',
    language: 'ukr',
    draft: {
      pass_threshold: 60,
      questions: questions.map((question, index) => ({
        number: String(index + 1),
        text: question.text,
        options: question.options.map((option, position) => ({
          label: letters[position] ?? '?',
          ...option,
        })),
        explanation: question.explanation ?? null,
      })),
    },
    published: null,
    course_root_id: 'root-1',
    unpublished_changes: true,
    incomplete: [],
    check: { state: 'not_checked', explanations: {}, doubts: {} },
    ...more,
  }
}

const QUESTIONS: BodyQuestion[] = [
  {
    text: 'Що виведе print(1 + 1)?',
    options: [
      { text: '2', correct: true },
      { text: '11', correct: false },
    ],
    explanation: 'Додаються числа, а не рядки.',
  },
  {
    text: 'Яке ім’я змінної неправильне?',
    options: [
      { text: 'total', correct: false },
      { text: '2total', correct: true },
      { text: '_total', correct: false },
    ],
  },
]

function keysOf(draft: TestDraft): string[] {
  return draft.questions.flatMap((question) => [
    question.key,
    ...question.options.map((option) => option.key),
  ])
}

function texts(draft: TestDraft): string[] {
  return draft.questions.map((question) => question.text)
}

function nOptions(n: number): BodyQuestion['options'] {
  return Array.from({ length: n }, (_, index) => ({
    text: `варіант ${index + 1}`,
    correct: index === 0,
  }))
}

// The unfinished drafts of the backend's tests/_helpers/unfinished_drafts.py —
// UNFINISHED and EVERY_PLACE, written out by the backend as JSON and pasted
// between the markers: each form's questions and the ``incomplete`` its
// reading answers with. The same forms, the same places.
// <unfinished-drafts>
const SERVER_DRAFTS: Record<
  string,
  { questions: BodyQuestion[]; incomplete: WrittenTestIncompletePlace[] }
> = {
  "no-questions": {
    "questions": [],
    "incomplete": [
      {
        "code": "TEST_NO_QUESTIONS",
        "question": null,
        "option": null
      }
    ]
  },
  "no-options": {
    "questions": [
      {
        "text": "Що?",
        "options": []
      }
    ],
    "incomplete": [
      {
        "code": "TEST_OPTIONS_COUNT",
        "question": 1,
        "option": null
      }
    ]
  },
  "one-option": {
    "questions": [
      {
        "text": "Що?",
        "options": [
          {
            "text": "так",
            "correct": true
          }
        ]
      }
    ],
    "incomplete": [
      {
        "code": "TEST_OPTIONS_COUNT",
        "question": 1,
        "option": null
      }
    ]
  },
  "no-mark": {
    "questions": [
      {
        "text": "Що?",
        "options": [
          {
            "text": "так",
            "correct": false
          },
          {
            "text": "ні",
            "correct": false
          }
        ]
      }
    ],
    "incomplete": [
      {
        "code": "TEST_NO_CORRECT_OPTION",
        "question": 1,
        "option": null
      }
    ]
  },
  "empty-question": {
    "questions": [
      {
        "text": "",
        "options": [
          {
            "text": "так",
            "correct": true
          },
          {
            "text": "ні",
            "correct": false
          }
        ]
      }
    ],
    "incomplete": [
      {
        "code": "TEST_TEXT_EMPTY",
        "question": 1,
        "option": null
      }
    ]
  },
  "empty-option": {
    "questions": [
      {
        "text": "Що?",
        "options": [
          {
            "text": "",
            "correct": true
          },
          {
            "text": "ні",
            "correct": false
          }
        ]
      }
    ],
    "incomplete": [
      {
        "code": "TEST_TEXT_EMPTY",
        "question": 1,
        "option": 1
      }
    ]
  },
  "every-place": {
    "questions": [
      {
        "text": "",
        "options": [
          {
            "text": "",
            "correct": false
          }
        ]
      },
      {
        "text": "Що?",
        "options": []
      }
    ],
    "incomplete": [
      {
        "code": "TEST_TEXT_EMPTY",
        "question": 1,
        "option": null
      },
      {
        "code": "TEST_TEXT_EMPTY",
        "question": 1,
        "option": 1
      },
      {
        "code": "TEST_OPTIONS_COUNT",
        "question": 1,
        "option": null
      },
      {
        "code": "TEST_NO_CORRECT_OPTION",
        "question": 1,
        "option": null
      },
      {
        "code": "TEST_OPTIONS_COUNT",
        "question": 2,
        "option": null
      }
    ]
  }
}
// </unfinished-drafts>

describe('testDraft', () => {
  it('reads a server draft into cards with stable keys', () => {
    const draft = draftFromServer(reading(QUESTIONS))

    expect(draft.title).toBe('Змінні')
    expect(draft.passThreshold).toBe('60')
    expect(draft.questions.map((question) => question.savedNumber)).toEqual([
      '1',
      '2',
    ])
    expect(draft.questions[0]).toMatchObject({
      text: 'Що виведе print(1 + 1)?',
      explanation: 'Додаються числа, а не рядки.',
      options: [
        { text: '2', correct: true },
        { text: '11', correct: false },
      ],
    })
    expect(draft.questions[1]?.explanation).toBeNull()
    const keys = keysOf(draft)
    expect(new Set(keys).size).toBe(keys.length)
    // Stable: an edit or a move keeps every key; a new reading has new ones.
    const [first, second] = draft.questions
    const edited = moveQuestion(
      setQuestion(draft, second!.key, { text: 'Інше' }),
      first!.key,
      'down',
    )
    expect(new Set(keysOf(edited))).toEqual(new Set(keys))
    const again = keysOf(draftFromServer(reading(QUESTIONS)))
    expect(again.filter((key) => keys.includes(key))).toEqual([])
    // A test without a title or a pass mark reads as empty fields.
    const bare = draftFromServer(
      reading([], {
        title: null,
        draft: { pass_threshold: null, questions: [] },
      }),
    )
    expect(bare).toEqual(emptyDraft())
  })

  it('sends trimmed texts and leaves out an empty explanation and pass mark', () => {
    const draft: TestDraft = {
      title: '  Змінні  ',
      passThreshold: ' 60 ',
      questions: [
        {
          key: 'q1',
          savedNumber: '1',
          text: ' Що виведе print(1 + 1)? ',
          options: [
            { key: 'o1', text: ' 2 ', correct: true },
            { key: 'o2', text: '11\n', correct: false },
          ],
          explanation: '   ',
        },
        {
          key: 'q2',
          savedNumber: null,
          text: 'Чому?',
          options: [],
          explanation: ' Бо так рахує Python. ',
        },
        {
          key: 'q3',
          savedNumber: null,
          text: '',
          options: [],
          explanation: null,
        },
      ],
    }

    expect(draftBody(draft)).toEqual({
      title: 'Змінні',
      pass_threshold: 60,
      questions: [
        {
          text: 'Що виведе print(1 + 1)?',
          options: [
            { text: '2', correct: true },
            { text: '11', correct: false },
          ],
        },
        { text: 'Чому?', options: [], explanation: 'Бо так рахує Python.' },
        { text: '', options: [] },
      ],
    })
    const [opened] = draftBody(draft).questions
    expect(opened).not.toHaveProperty('explanation')
    // No pass mark, or one the route would refuse: the key is left out.
    for (const passThreshold of ['', '  ', 'abc', '0', '101']) {
      expect(draftBody({ ...draft, passThreshold })).not.toHaveProperty(
        'pass_threshold',
      )
    }
  })

  it('sees no change after moving an item there and back', () => {
    const saved = draftFromServer(reading(QUESTIONS))
    const [first] = saved.questions
    const [, option] = saved.questions[1]!.options
    const questionThereAndBack = moveQuestion(
      moveQuestion(saved, first!.key, 'down'),
      first!.key,
      'up',
    )
    const optionThereAndBack = moveOption(
      moveOption(saved, saved.questions[1]!.key, option!.key, 'up'),
      saved.questions[1]!.key,
      option!.key,
      'down',
    )

    expect(hasUnsavedChanges(questionThereAndBack, saved)).toBe(false)
    expect(hasUnsavedChanges(optionThereAndBack, saved)).toBe(false)
    // Nor spaces a save would trim, nor an opened explanation left empty.
    const spaced = setSettings(saved, { title: ' Змінні ' })
    expect(hasUnsavedChanges(spaced, saved)).toBe(false)
    const opened = setQuestion(saved, saved.questions[1]!.key, {
      explanation: '',
    })
    expect(hasUnsavedChanges(opened, saved)).toBe(false)
  })

  it('sees every change a save would make', () => {
    const saved = draftFromServer(reading(QUESTIONS))
    const [first, second] = saved.questions
    const option = first!.options[1]!
    const changes: TestDraft[] = [
      setSettings(saved, { title: 'Змінні й типи' }),
      setSettings(saved, { passThreshold: '70' }),
      setSettings(saved, { passThreshold: '' }),
      // Not a pass mark the route takes — still a change: saving shows why.
      setSettings(saved, { passThreshold: 'abc' }),
      setQuestion(saved, first!.key, { text: 'Що виведе print(2 + 2)?' }),
      setQuestion(saved, second!.key, { explanation: 'Цифрою почати не можна.' }),
      setQuestion(saved, first!.key, { explanation: null }),
      setOption(saved, first!.key, option.key, { text: '22' }),
      setOption(saved, first!.key, option.key, { correct: true }),
      moveQuestion(saved, first!.key, 'down'),
      moveOption(saved, first!.key, option.key, 'up'),
      addQuestion(saved),
      addOption(saved, first!.key),
      removeQuestion(saved, second!.key),
      removeOption(saved, first!.key, option.key),
    ]

    for (const changed of changes) {
      expect(hasUnsavedChanges(changed, saved)).toBe(true)
    }
    // Where no pass mark was set, one the route would refuse is a change too:
    // the body alone, which leaves it out, would call it none.
    const unset = setSettings(saved, { passThreshold: '' })
    const refusedMark = setSettings(unset, { passThreshold: 'abc' })
    expect(hasUnsavedChanges(refusedMark, unset)).toBe(true)
    expect(hasUnsavedChanges(emptyDraft(), emptyDraft())).toBe(false)
  })

  it('lists what is unfinished as the server does', () => {
    expect(Object.keys(SERVER_DRAFTS)).toEqual([
      'no-questions',
      'no-options',
      'one-option',
      'no-mark',
      'empty-question',
      'empty-option',
      'every-place',
    ])
    for (const { questions, incomplete } of Object.values(SERVER_DRAFTS)) {
      expect(incompletePlaces(draftFromServer(reading(questions)))).toEqual(
        incomplete,
      )
    }
    // A text is empty once trimmed, as the server trims it: typed spaces are
    // nothing yet. The places the backend's incomplete_places gives the same
    // question read from JSON.
    const blank = reading([
      {
        text: '   ',
        options: [
          { text: '\t', correct: true },
          { text: ' так ', correct: false },
        ],
      },
    ])
    expect(incompletePlaces(draftFromServer(blank))).toEqual([
      { code: 'TEST_TEXT_EMPTY', question: 1, option: null },
      { code: 'TEST_TEXT_EMPTY', question: 1, option: 1 },
    ])
    expect(incompletePlaces(draftFromServer(reading(QUESTIONS)))).toEqual([])
  })

  it('moves, adds and removes questions and options', () => {
    const saved = draftFromServer(reading(QUESTIONS))
    const before = structuredClone(saved)
    const [first, second] = saved.questions

    // Questions: a new one goes last, empty and unsaved.
    const added = addQuestion(saved)
    expect(added.questions).toHaveLength(3)
    expect(added.questions[2]).toMatchObject({
      savedNumber: null,
      text: '',
      options: [],
      explanation: null,
    })
    expect(texts(removeQuestion(saved, first!.key))).toEqual([
      'Яке ім’я змінної неправильне?',
    ])
    // Up and down — and neither end moves past itself.
    expect(texts(moveQuestion(saved, second!.key, 'up'))).toEqual([
      'Яке ім’я змінної неправильне?',
      'Що виведе print(1 + 1)?',
    ])
    expect(texts(moveQuestion(saved, first!.key, 'down'))).toEqual([
      'Яке ім’я змінної неправильне?',
      'Що виведе print(1 + 1)?',
    ])
    expect(texts(moveQuestion(saved, first!.key, 'up'))).toEqual(texts(saved))
    expect(texts(moveQuestion(saved, second!.key, 'down'))).toEqual(
      texts(saved),
    )

    // Options, within their question.
    const optionTexts = (draft: TestDraft) =>
      draft.questions[1]!.options.map((option) => option.text)
    const [a, b, c] = second!.options
    const withOption = addOption(saved, second!.key)
    expect(withOption.questions[1]!.options[3]).toMatchObject({
      text: '',
      correct: false,
    })
    expect(optionTexts(removeOption(saved, second!.key, b!.key))).toEqual([
      'total',
      '_total',
    ])
    expect(optionTexts(moveOption(saved, second!.key, b!.key, 'up'))).toEqual([
      '2total',
      'total',
      '_total',
    ])
    expect(optionTexts(moveOption(saved, second!.key, b!.key, 'down'))).toEqual(
      ['total', '_total', '2total'],
    )
    expect(optionTexts(moveOption(saved, second!.key, a!.key, 'up'))).toEqual(
      optionTexts(saved),
    )
    expect(optionTexts(moveOption(saved, second!.key, c!.key, 'down'))).toEqual(
      optionTexts(saved),
    )
    // The draft each action was given is left as it was.
    expect(saved).toEqual(before)
  })

  it('sets texts, marks, the pass mark and an own explanation', () => {
    const saved = draftFromServer(reading(QUESTIONS))
    const [first, second] = saved.questions
    const option = first!.options[1]!

    expect(setSettings(saved, { title: 'Типи' }).title).toBe('Типи')
    expect(setSettings(saved, { passThreshold: '75' }).passThreshold).toBe('75')
    expect(
      setQuestion(saved, first!.key, { text: 'Нове' }).questions[0]!.text,
    ).toBe('Нове')
    const opened = setQuestion(saved, second!.key, { explanation: '' })
    expect(opened.questions[1]!.explanation).toBe('')
    expect(
      setQuestion(opened, second!.key, { explanation: null }).questions[1]!
        .explanation,
    ).toBeNull()
    const marked = setOption(saved, first!.key, option.key, { correct: true })
    expect(marked.questions[0]!.options[1]).toMatchObject({
      text: '11',
      correct: true,
    })
    expect(
      setOption(saved, first!.key, option.key, { text: '22' }).questions[0]!
        .options[1]!.text,
    ).toBe('22')
    // A card left alone is the same object, so a memoized card skips a render.
    expect(marked.questions[1]).toBe(saved.questions[1])
  })

  it('stops at 26 options and 200 questions', () => {
    const none = draftFromServer(reading([{ text: 'Що?', options: [] }]))
    expect(canAddOption(none.questions[0]!)).toBe(true)

    const full = draftFromServer(reading([{ text: 'Що?', options: nOptions(25) }]))
    const questionKey = full.questions[0]!.key
    const at26 = addOption(full, questionKey)
    expect(at26.questions[0]!.options).toHaveLength(TEST_LIMITS.options)
    expect(canAddOption(at26.questions[0]!)).toBe(false)
    expect(addOption(at26, questionKey)).toEqual(at26)

    const many = draftFromServer(
      reading(
        Array.from({ length: 199 }, (_, index) => ({
          text: `Питання ${index + 1}`,
          options: nOptions(2),
        })),
      ),
    )
    const at200 = addQuestion(many)
    expect(at200.questions).toHaveLength(TEST_LIMITS.questions)
    expect(canAddQuestion(at200)).toBe(false)
    expect(addQuestion(at200)).toBe(at200)
  })

  it('checks the limits of each field', () => {
    const draft = draftFromServer(reading(QUESTIONS))
    const [first] = draft.questions
    const option = first!.options[0]!
    const long = (n: number) => 'я'.repeat(n)

    expect(fieldProblems(draft)).toEqual([])
    // Title: required, at most 200 characters once trimmed.
    expect(fieldProblems(setSettings(draft, { title: '  ' }))).toEqual([
      { field: 'title', kind: 'empty' },
    ])
    expect(fieldProblems(setSettings(draft, { title: long(200) }))).toEqual([])
    expect(fieldProblems(setSettings(draft, { title: long(201) }))).toEqual([
      { field: 'title', kind: 'too_long' },
    ])
    // Characters as the route counts them: an emoji is one, not two units.
    expect(fieldProblems(setSettings(draft, { title: '🙂'.repeat(200) }))).toEqual(
      [],
    )
    // Pass mark: none, or a whole number from 1 to 100.
    for (const passThreshold of ['', '1', '100', ' 50 ']) {
      expect(fieldProblems(setSettings(draft, { passThreshold }))).toEqual([])
    }
    for (const passThreshold of ['0', '101', 'abc', '5.5', '-1', '1e2']) {
      expect(fieldProblems(setSettings(draft, { passThreshold }))).toEqual([
        { field: 'pass_threshold', kind: 'invalid' },
      ])
    }
    // Texts: question 2 000, option 500, own explanation 2 000 — trimmed.
    const questionKey = first!.key
    expect(
      fieldProblems(setQuestion(draft, questionKey, { text: `${long(2_000)}  ` })),
    ).toEqual([])
    expect(
      fieldProblems(setQuestion(draft, questionKey, { text: long(2_001) })),
    ).toEqual([{ field: 'question', questionKey, kind: 'too_long' }])
    expect(
      fieldProblems(setOption(draft, questionKey, option.key, { text: long(500) })),
    ).toEqual([])
    expect(
      fieldProblems(setOption(draft, questionKey, option.key, { text: long(501) })),
    ).toEqual([
      { field: 'option', questionKey, optionKey: option.key, kind: 'too_long' },
    ])
    expect(
      fieldProblems(
        setQuestion(draft, questionKey, { explanation: long(2_000) }),
      ),
    ).toEqual([])
    expect(
      fieldProblems(
        setQuestion(draft, questionKey, { explanation: long(2_001) }),
      ),
    ).toEqual([{ field: 'explanation', questionKey, kind: 'too_long' }])
  })

  it('checks a YAML file before it is sent', () => {
    const limit = TEST_LIMITS.yamlFileBytes
    expect(yamlFileProblem({ name: 'test.yaml', size: limit })).toBeNull()
    expect(yamlFileProblem({ name: 'Тест.YML', size: 10 })).toBeNull()
    expect(yamlFileProblem({ name: 'test.yaml', size: limit + 1 })).toBe(
      'too_large',
    )
    expect(yamlFileProblem({ name: 'test.json', size: 10 })).toBe('not_yaml')
    expect(yamlFileProblem({ name: 'test.yaml.txt', size: 10 })).toBe(
      'not_yaml',
    )
  })

  it('takes the answer to a save, keeping the cards and what was typed since', () => {
    const saved = draftFromServer(reading(QUESTIONS))
    const sent = setQuestion(saved, saved.questions[0]!.key, {
      text: '  Що виведе print(3)?  ',
    })
    const answer = reading([
      { ...QUESTIONS[0]!, text: 'Що виведе print(3)?' },
      QUESTIONS[1]!,
    ])

    // Nothing typed since: the server's texts, the cards sent.
    const quiet = draftAfterSave(sent, sent, answer)
    expect(quiet.questions[0]!.text).toBe('Що виведе print(3)?')
    expect(keysOf(quiet)).toEqual(keysOf(sent))

    // Typed and moved since: the author's draft stays, numbered as saved.
    const [first, second] = sent.questions
    const since = moveQuestion(
      setQuestion(sent, second!.key, { text: 'Ще пишу' }),
      second!.key,
      'up',
    )
    const busy = draftAfterSave(since, sent, answer)
    expect(texts(busy)).toEqual(['Ще пишу', '  Що виведе print(3)?  '])
    expect(busy.questions.map((question) => question.savedNumber)).toEqual([
      '2',
      '1',
    ])
    expect(busy.questions[1]!.key).toBe(first!.key)
  })

  it("binds the model's explanation and doubt to a card by its saved number", () => {
    const saved = draftFromServer(reading(QUESTIONS))
    const check = {
      state: 'ready' as const,
      explanations: { '1': 'Числа додаються.', '2': 'Ім’я не починають цифрою.' },
      doubts: { '2': true },
    }
    const moved = moveQuestion(saved, saved.questions[1]!.key, 'up')

    expect(modelNote(check, moved.questions[0]!)).toEqual({
      explanation: 'Ім’я не починають цифрою.',
      doubt: true,
    })
    expect(modelNote(check, moved.questions[1]!)).toEqual({
      explanation: 'Числа додаються.',
      doubt: false,
    })
    const added = addQuestion(saved)
    expect(modelNote(check, added.questions[2]!)).toEqual({
      explanation: null,
      doubt: false,
    })
    for (const state of ['not_checked', 'in_progress', 'failed'] as const) {
      expect(modelNote({ ...check, state }, saved.questions[0]!)).toEqual({
        explanation: null,
        doubt: false,
      })
    }
  })
})
