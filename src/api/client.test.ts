import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, apiUrl } from './client'
import { useAuthStore } from '../stores/auth'

// Tested at the fetch boundary with real ``Response`` objects: a stub with
// hand-made ``json`` and ``text`` would answer whichever one the client asked
// for, and how the answer is read is what these tests are about.

const KEY = 'key-of-the-author'

// The YAML the export route serves, as the backend writes it — not JSON.
const EXPORTED_YAML =
  'title: Змінні\npass_threshold: 60\nquestions:\n- text: Що виведе print(1 + 1)?\n' +
  "  options:\n  - text: '2'\n    correct: true\n  - text: '11'\n    correct: false\n" +
  '  explanation: Додаються числа, а не рядки.\n'

function answering(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function sent(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string> }
}

describe('api', () => {
  beforeEach(() => useAuthStore.getState().setApiKey(KEY))
  afterEach(() => {
    vi.unstubAllGlobals()
    useAuthStore.getState().logout()
  })

  it('puts JSON', async () => {
    const fetchMock = answering(json({ id: 'test-1' }))

    const answer = await api.put('/api/v1/tests/test-1/draft', { questions: [] })

    expect(answer).toEqual({ id: 'test-1' })
    const { url, init, headers } = sent(fetchMock)
    expect(url).toBe(apiUrl('/api/v1/tests/test-1/draft'))
    expect(init.method).toBe('PUT')
    expect(init.body).toBe('{"questions":[]}')
    expect(headers).toEqual({
      'X-API-Key': KEY,
      'Content-Type': 'application/json',
    })
  })

  it('puts a YAML body with its own content type', async () => {
    const fetchMock = answering(json({ id: 'test-1' }))
    const file = new File([EXPORTED_YAML], 'test.yaml')

    const answer = await api.putText(
      '/api/v1/tests/test-1/draft',
      file,
      'application/yaml',
    )

    expect(answer).toEqual({ id: 'test-1' })
    const { init, headers } = sent(fetchMock)
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(file)
    expect(headers).toEqual({
      'X-API-Key': KEY,
      'Content-Type': 'application/yaml',
    })
  })

  it('reads a text answer', async () => {
    const fetchMock = answering(
      new Response(EXPORTED_YAML, {
        status: 200,
        headers: { 'Content-Type': 'application/yaml' },
      }),
    )

    const text = await api.getText('/api/v1/tests/test-1/yaml')

    expect(text).toBe(EXPORTED_YAML)
    const { url, headers } = sent(fetchMock)
    expect(url).toBe(apiUrl('/api/v1/tests/test-1/yaml'))
    expect(headers).toEqual({ 'X-API-Key': KEY })
  })

  it('turns a refusal into an ApiError with its body', async () => {
    const body = {
      detail: {
        code: 'TEST_FIELD_INVALID',
        details: 'question 1, option 2: text has 501 characters; at most 500',
        place: { line: null, column: null, question: 1, option: 2 },
      },
    }
    answering(json(body, 422))

    const refusal = await api
      .put('/api/v1/tests/test-1/draft', { questions: [] })
      .catch((error: unknown) => error)

    expect(refusal).toBeInstanceOf(ApiError)
    expect(refusal).toMatchObject({ status: 422, body })
  })
})
