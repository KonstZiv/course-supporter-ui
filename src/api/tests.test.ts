import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WrittenTestBody } from '../types/api'

// Mock the fetch wrapper to assert the call shape (project convention — no msw).
const { getMock, getTextMock, postMock, putMock, putTextMock } = vi.hoisted(
  () => ({
    getMock: vi.fn(),
    getTextMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn(),
    putTextMock: vi.fn(),
  }),
)
vi.mock('./client', () => ({
  api: {
    get: getMock,
    getText: getTextMock,
    post: postMock,
    put: putMock,
    putText: putTextMock,
  },
}))

import { testRefusal, testsApi } from './tests'

const BODY: WrittenTestBody & { title: string } = {
  title: 'Змінні',
  pass_threshold: 60,
  questions: [
    {
      text: 'Що виведе print(1 + 1)?',
      options: [
        { text: '2', correct: true },
        { text: '11', correct: false },
      ],
      explanation: 'Додаються числа, а не рядки.',
    },
  ],
}

describe('testsApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the test routes with their methods and bodies', () => {
    const file = new File(['title: Змінні\n'], 'test.yaml')

    testsApi.create('node-1', BODY)
    testsApi.get('test-1')
    testsApi.replace('test-1', BODY)
    testsApi.replaceWithYaml('test-1', file)
    testsApi.check('test-1')
    testsApi.publish('test-1')
    testsApi.exportYaml('test-1')

    expect(postMock.mock.calls).toEqual([
      ['/api/v1/nodes/node-1/tests', BODY],
      ['/api/v1/tests/test-1/check'],
      ['/api/v1/tests/test-1/publish'],
    ])
    expect(getMock.mock.calls).toEqual([['/api/v1/tests/test-1/draft']])
    expect(putMock.mock.calls).toEqual([['/api/v1/tests/test-1/draft', BODY]])
    expect(putTextMock.mock.calls).toEqual([
      ['/api/v1/tests/test-1/draft', file, 'application/yaml'],
    ])
    expect(getTextMock.mock.calls).toEqual([['/api/v1/tests/test-1/yaml']])
  })
})

// The bodies below are the backend's own, produced by its format code
// (``api/routes/_author_shared.py``) for a real draft — not hand-shaped.
describe('testRefusal', () => {
  it('reads a refusal of the format with its place', () => {
    const place = { line: 9, column: 9, question: 1, option: 2 }

    const refusal = testRefusal({
      detail: {
        code: 'TEST_YAML_DUPLICATE_KEY',
        details: "question 1, option 2: 'correct' is given twice",
        place,
      },
    })

    expect(refusal).toEqual({
      code: 'TEST_YAML_DUPLICATE_KEY',
      details: "question 1, option 2: 'correct' is given twice",
      place,
      incomplete: null,
      category: null,
    })
  })

  it('reads an unfinished draft refused with every place', () => {
    const incomplete = [
      { code: 'TEST_TEXT_EMPTY', question: 1, option: null },
      { code: 'TEST_TEXT_EMPTY', question: 1, option: 2 },
      { code: 'TEST_NO_CORRECT_OPTION', question: 1, option: null },
      { code: 'TEST_OPTIONS_COUNT', question: 2, option: null },
    ]

    const refusal = testRefusal({
      detail: {
        code: 'TEST_DRAFT_INCOMPLETE',
        details:
          'the draft is not finished: every place listed must be completed first',
        incomplete,
      },
    })

    expect(refusal).toMatchObject({
      code: 'TEST_DRAFT_INCOMPLETE',
      place: null,
      incomplete,
      category: null,
    })
  })

  it('reads a collision and a screened text, neither with a place', () => {
    expect(
      testRefusal({
        detail: {
          code: 'GENERATION_IN_PROGRESS',
          details:
            'another job of this task is still running — its explanations ' +
            'being written, or the task itself being processed; nothing was ' +
            'saved, so send the request again once it finishes',
        },
      }),
    ).toMatchObject({
      code: 'GENERATION_IN_PROGRESS',
      place: null,
      incomplete: null,
      category: null,
    })
    expect(
      testRefusal({
        detail: {
          code: 'SECURITY_REJECTED',
          category: 'suspicious_unicode',
          details: 'zero_width U+200B at index 4',
        },
      }),
    ).toMatchObject({
      code: 'SECURITY_REJECTED',
      place: null,
      incomplete: null,
      category: 'suspicious_unicode',
    })
  })

  it('is null for a body that is not a coded refusal', () => {
    expect(testRefusal({ detail: 'Document not found' })).toBeNull()
    expect(
      testRefusal({
        detail: [
          {
            loc: ['path', 'document_id'],
            msg: 'Input should be a valid UUID',
            type: 'uuid_parsing',
          },
        ],
      }),
    ).toBeNull()
    // The envelope is the server's: a code at the top level is not its answer.
    expect(
      testRefusal({ code: 'TEST_FIELD_INVALID', details: 'x', place: {} }),
    ).toBeNull()
    expect(testRefusal(null)).toBeNull()
  })
})
