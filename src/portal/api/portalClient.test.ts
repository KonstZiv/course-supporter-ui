import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  billingReason,
  doorRefusal,
  portalApi,
  PortalApiError,
  refusedSignupId,
} from './portalClient'
import { usePortalSession } from '../stores/session'
import { useServiceStatus } from '../../serviceStatus/store'

describe('portalApi.submitTask (authPost)', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs FormData with the bearer and no Content-Type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () =>
        Promise.resolve({ submission_id: 'x', status: 'received', duplicate: false }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const fd = new FormData()
    fd.append('file', new Blob(['hi']), 'a.py')
    const res = await portalApi.submitTask('task-1', fd)

    expect(res).toEqual({ submission_id: 'x', status: 'received', duplicate: false })
    const call = fetchMock.mock.calls[0]
    expect(call).toBeTruthy()
    const [url, init] = call as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/tasks/task-1/submissions')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt')
    expect(headers['Content-Type']).toBeUndefined()
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('throws PortalApiError on a 422 (caller renders inline)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ detail: 'bad extension' }),
      }),
    )
    await expect(portalApi.submitTask('t', new FormData())).rejects.toBeInstanceOf(
      PortalApiError,
    )
  })
})

describe('portalApi read-path (c3b: submissions / submission)', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs the own-attempts list with the bearer', async () => {
    const rows = [
      { id: 'a', status: 'completed', score: 85, verdict: null, created_at: 'x', original_filename: 'f.py' },
    ]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(rows),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await portalApi.submissions('task-7')
    expect(res).toEqual(rows)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/tasks/task-7/submissions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt')
  })

  it('GETs one submission detail with the bearer', async () => {
    const detail = {
      id: 'sub-1',
      status: 'completed',
      score: 90,
      verdict: { passed: true, correctness: 'correct' },
      review_markdown: '# Review',
      created_at: 'x',
      original_filename: 'f.py',
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(detail),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await portalApi.submission('sub-1')
    expect(res).toEqual(detail)
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/submissions/sub-1')
  })

  it('inherits the 401-clear-redirect contract (throws, clears session)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(null),
      }),
    )
    await expect(portalApi.submissions('t')).rejects.toBeInstanceOf(PortalApiError)
    expect(usePortalSession.getState().token).toBeNull()
  })
})

describe('portalApi.base (KD18 P5 base-download)', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs the base descriptor with the bearer and returns original_url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ original_url: 'https://s3/orig.zip?sig=1' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await portalApi.base('task-9')
    expect(res).toEqual({ original_url: 'https://s3/orig.zip?sig=1' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/tasks/task-9/base')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt')
  })

  it('distinct-404 (no ready base) surfaces body.detail for the caller', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({ detail: 'No base is available for this task yet.' }),
      }),
    )
    await expect(portalApi.base('t')).rejects.toMatchObject({
      status: 404,
      body: { detail: 'No base is available for this task yet.' },
    })
  })

  it('generic-404 (access) carries the generic detail — distinguishable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: 'Task not found.' }),
      }),
    )
    await expect(portalApi.base('t')).rejects.toMatchObject({
      status: 404,
      body: { detail: 'Task not found.' },
    })
  })
})

describe('portalApi recovery (R3: public + protected JSON POST)', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().clear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('forgotPassword POSTs JSON without a bearer and resolves on 202', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 202 })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      portalApi.forgotPassword({ tenant_id: 't', login: 'olena' }),
    ).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/password/forgot')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers.Authorization).toBeUndefined()
    expect(init.body).toBe(JSON.stringify({ tenant_id: 't', login: 'olena' }))
  })

  it('resetPassword throws PortalApiError on a 400 (invalid/expired token)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: 'Invalid or expired token' }),
      }),
    )
    await expect(
      portalApi.resetPassword({ token: 'x', password: 'longenough1' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('setRecoveryEmail POSTs JSON with the bearer and returns the 200 body', async () => {
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
    const body = { recovery_email: 'a@b.com', recovery_email_confirmed: false }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await portalApi.setRecoveryEmail({ email: 'a@b.com' })
    expect(res).toEqual(body)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/recovery-email')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('setRecoveryEmail inherits the 401-clear-redirect contract', async () => {
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(null),
      }),
    )
    await expect(
      portalApi.setRecoveryEmail({ email: 'a@b.com' }),
    ).rejects.toBeInstanceOf(PortalApiError)
    expect(usePortalSession.getState().token).toBeNull()
  })
})

describe('portalApi test (task 07: structure, answers, refusal)', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs the test structure with the bearer', async () => {
    const structure = {
      version: 'v-hash',
      accepting_answers: true,
      questions: [
        {
          number: '1',
          text: 'Перше?',
          options: [
            { label: 'а', text: 'так' },
            { label: 'б', text: 'ні' },
          ],
        },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(structure),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await portalApi.testStructure('task-1')

    expect(res).toEqual(structure)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url.endsWith('/api/v1/portal/tasks/task-1/test')).toBe(true)
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt')
  })

  it('POSTs the answers as JSON with the bearer and returns the 202 body', async () => {
    const accepted = { submission_id: 'sub-1', status: 'received', duplicate: false }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve(accepted),
    })
    vi.stubGlobal('fetch', fetchMock)
    const body = { answers: { '1': ['б'], '2': ['а', 'в'] }, test_version: 'v-hash' }

    const res = await portalApi.submitTest('task-1', body)

    expect(res).toEqual(accepted)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url.endsWith('/api/v1/portal/tasks/task-1/test-submissions')).toBe(true)
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer jwt')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify(body))
  })

  it('a refusal keeps its status and names its reason as {code, details}', async () => {
    const details = 'The test has changed since these answers were given.'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ detail: { code: 'TEST_VERSION_CHANGED', details } }),
      }),
    )

    const err: unknown = await portalApi
      .submitTest('task-1', { answers: { '1': ['а'] } })
      .catch((e: unknown) => e)

    expect(err).toBeInstanceOf(PortalApiError)
    expect((err as PortalApiError).status).toBe(409)
    expect(doorRefusal(err)).toEqual({ code: 'TEST_VERSION_CHANGED', details })
  })

  it('a failure without a code is no door refusal', () => {
    expect(
      doorRefusal(new PortalApiError(404, 'x', { detail: 'Task not found.' })),
    ).toBeNull()
    expect(
      doorRefusal(new PortalApiError(422, 'x', { detail: { details: 'no code' } })),
    ).toBeNull()
    expect(doorRefusal(new PortalApiError(500, 'x', null))).toBeNull()
    expect(doorRefusal(new TypeError('network'))).toBeNull()
  })

  it('details that are not a string come back as null', () => {
    expect(
      doorRefusal(new PortalApiError(409, 'x', { detail: { code: 'TEST_NOT_READY' } })),
    ).toEqual({ code: 'TEST_NOT_READY', details: null })
  })
})

describe('portalApi billing (the student units)', () => {
  const T = '019eda80-67ea-7060-b4c4-9dc85761690e'

  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: T,
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function okFetch(body: unknown = {}) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it.each([
    ['billingTerms', () => portalApi.billingTerms(), '/api/v1/portal/billing/terms'],
    ['billingPackages', () => portalApi.billingPackages(), '/api/v1/portal/billing/packages'],
    ['billingBalance', () => portalApi.billingBalance(), '/api/v1/portal/billing/balance'],
    ['billingOutlook', () => portalApi.billingOutlook(), '/api/v1/portal/billing/outlook'],
    [
      'billingCheckoutState',
      () => portalApi.billingCheckoutState('a b/c'),
      '/api/v1/portal/billing/checkouts/a%20b%2Fc',
    ],
    [
      'billingStatement',
      () => portalApi.billingStatement(),
      '/api/v1/portal/billing/statement?limit=50',
    ],
    [
      'billingStatement with a cursor',
      () => portalApi.billingStatement('cur/2'),
      '/api/v1/portal/billing/statement?limit=50&cursor=cur%2F2',
    ],
  ])('%s GETs its route with the session', async (_, call, path) => {
    const fetchMock = okFetch()
    await call()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url.endsWith(path)).toBe(true)
    expect(init.method).toBeUndefined()
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt')
  })

  it('the outlook is asked without a course', async () => {
    const fetchMock = okFetch()
    await portalApi.billingOutlook()
    expect(fetchMock.mock.calls[0]![0]).not.toContain('course_id')
  })

  it('billingConsent POSTs the revision and the fingerprint', async () => {
    const fetchMock = okFetch({ terms_version: 'v', consented_at: 'x' })
    await portalApi.billingConsent('2026-11-12', 'ff89')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/billing/consent')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      terms_version: '2026-11-12',
      text_sha256: 'ff89',
    })
  })

  it('billingCheckout POSTs the package only', async () => {
    const fetchMock = okFetch()
    await portalApi.billingCheckout('units-500')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/billing/checkout')
    expect(JSON.parse(init.body as string)).toEqual({ package_id: 'units-500' })
  })

  it('billingReason reads detail.code of a coded refusal, null otherwise', () => {
    expect(
      billingReason(
        new PortalApiError(409, 'x', { detail: { code: 'terms_changed', details: 'y' } }),
      ),
    ).toBe('terms_changed')
    expect(billingReason(new PortalApiError(404, 'x', { detail: 'Not Found' }))).toBeNull()
    expect(billingReason(new TypeError('Failed to fetch'))).toBeNull()
  })

  it('a 401 sends to the sign-in with the current page as next', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', {
      ...window.location,
      pathname: `/${T}/billing`,
      search: '?checkout=abc',
      assign,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve(null) }),
    )
    await expect(portalApi.billingBalance()).rejects.toBeInstanceOf(PortalApiError)
    expect(assign).toHaveBeenCalledWith(
      `/${T}/login?next=${encodeURIComponent(`/${T}/billing?checkout=abc`)}`,
    )
    expect(usePortalSession.getState().token).toBeNull()
  })

  it('no redirect from the sign-in page itself', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, pathname: `/${T}/login`, search: '', assign })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve(null) }),
    )
    await expect(portalApi.billingBalance()).rejects.toBeInstanceOf(PortalApiError)
    expect(assign).not.toHaveBeenCalled()
  })
})

describe('portalApi open courses (O-1)', () => {
  const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
  const SIGNUP = '019edc00-0000-7000-8000-0000000000aa'

  function answer(status: number, body: unknown, headers: Record<string, string> = {}) {
    return vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      json: () => Promise.resolve(body),
    })
  }

  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().clear()
    useServiceStatus.setState({ status: 'ok', since: null })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useServiceStatus.setState({ status: 'ok', since: null })
  })

  it('the course card is a public GET with the key escaped', async () => {
    const card = {
      course_id: 'c',
      course_title: 'Demo',
      author_name: 'A',
      languages: ['ukr'],
      terms_version: '2027-01-15',
    }
    const fetchMock = answer(200, card)
    vi.stubGlobal('fetch', fetchMock)
    expect(await portalApi.joinCard(T, 'k/ey')).toEqual(card)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toBe(`/api/v1/portal/join/${T}/k%2Fey`)
    expect(init).toBeUndefined()
  })

  it('the signup POSTs JSON without a bearer and returns the 202 body', async () => {
    usePortalSession.getState().setSession({ token: 'jwt', tenantId: T, studentId: 's', displayName: null })
    const accepted = { signup_id: SIGNUP, email_masked: 'o***@e***.com', expires_at: '2026-11-30T10:00:00Z' }
    const fetchMock = answer(202, accepted)
    vi.stubGlobal('fetch', fetchMock)
    const req = {
      login: 'olena',
      password: 'long-enough-1',
      email: 'olena@example.com',
      display_name: null,
      interface_language: 'ukr',
      adult: true,
      terms_version: '2026-11-13',
      text_sha256: 'a'.repeat(64),
    }
    expect(await portalApi.joinSignup(T, 'key1', req)).toEqual(accepted)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/v1/portal/join/${T}/key1/signup`)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(JSON.parse(init.body as string)).toEqual(req)
  })

  it('resend, confirm and another login go to their routes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 202, json: () => Promise.resolve({ signup_id: SIGNUP }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ access_token: 'x' }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.reject(new Error('no body')) })
    vi.stubGlobal('fetch', fetchMock)
    await portalApi.joinResend(SIGNUP)
    await portalApi.joinConfirm('tok')
    await expect(portalApi.joinChangeLogin(SIGNUP, { login: 'new', token: 'tok' })).resolves.toBeUndefined()
    const calls = fetchMock.mock.calls as [string, RequestInit][]
    expect(calls.map(([url]) => url)).toEqual([
      '/api/v1/portal/join/resend',
      '/api/v1/portal/join/confirm',
      `/api/v1/portal/join/${SIGNUP}/login`,
    ])
    expect(calls.map(([, init]) => JSON.parse(init.body as string))).toEqual([
      { signup_id: SIGNUP },
      { token: 'tok' },
      { login: 'new', token: 'tok' },
    ])
  })

  it('the login by email answers a session or a choice', async () => {
    const choice = { choose: [{ tenant_id: T, tenant_name: 'A', login: 'olena' }] }
    const fetchMock = answer(200, choice)
    vi.stubGlobal('fetch', fetchMock)
    expect(await portalApi.loginByEmail({ email: 'o@e.com', password: 'p' })).toEqual(choice)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/portal/login-by-email')
    expect(JSON.parse(init.body as string)).toEqual({ email: 'o@e.com', password: 'p' })
  })

  it('a course join goes with the session', async () => {
    usePortalSession.getState().setSession({ token: 'jwt', tenantId: T, studentId: 's', displayName: null })
    const fetchMock = answer(200, { status: 'already_enrolled', course_id: 'c' })
    vi.stubGlobal('fetch', fetchMock)
    const req = { tenant_id: T, key: 'k', adult: true, terms_version: 'v', text_sha256: 'b'.repeat(64) }
    expect(await portalApi.joinCourse(req)).toEqual({ status: 'already_enrolled', course_id: 'c' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/portal/courses/join')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt')
    expect(JSON.parse(init.body as string)).toEqual(req)
  })

  it('a 429 keeps its Retry-After, in seconds', async () => {
    vi.stubGlobal(
      'fetch',
      answer(429, { detail: { code: 'rate_limited', details: 'x' } }, { 'Retry-After': '125' }),
    )
    const err = await portalApi.joinResend(SIGNUP).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PortalApiError)
    expect((err as PortalApiError).retryAfter).toBe(125)
    expect(doorRefusal(err)?.code).toBe('rate_limited')
  })

  it('no Retry-After, or one not in seconds, is null', async () => {
    vi.stubGlobal('fetch', answer(429, null, { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' }))
    const dated = await portalApi.joinResend(SIGNUP).catch((e: unknown) => e)
    expect((dated as PortalApiError).retryAfter).toBeNull()
    vi.stubGlobal('fetch', answer(429, null))
    const bare = await portalApi.joinResend(SIGNUP).catch((e: unknown) => e)
    expect((bare as PortalApiError).retryAfter).toBeNull()
  })

  it('refusedSignupId reads the request a login_taken names', () => {
    const taken = new PortalApiError(409, 'x', {
      detail: { code: 'login_taken', details: 'x', signup_id: SIGNUP },
    })
    expect(refusedSignupId(taken)).toBe(SIGNUP)
    expect(refusedSignupId(new PortalApiError(409, 'x', { detail: { code: 'login_taken' } }))).toBeNull()
    expect(refusedSignupId(new Error('x'))).toBeNull()
  })

  it('a 503 service_updating on a public call raises the updating state with Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      answer(503, { detail: 'service_updating' }, { 'Retry-After': '30' }),
    )
    const err = await portalApi.joinCard(T, 'key1').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(PortalApiError)
    expect((err as PortalApiError).status).toBe(503)
    const state = useServiceStatus.getState()
    expect(state.status).toBe('updating')
    expect(state.retryAfter).toBe(30)
  })

  it('a 503 on a public POST (signup) does the same', async () => {
    vi.stubGlobal('fetch', answer(503, { detail: 'service_updating' }))
    await expect(
      portalApi.loginByEmail({ email: 'o@e.com', password: 'p' }),
    ).rejects.toBeInstanceOf(PortalApiError)
    expect(useServiceStatus.getState().status).toBe('updating')
  })

  it('an ordinary public failure does not raise the updating state', async () => {
    vi.stubGlobal('fetch', answer(409, { detail: { code: 'login_taken', details: 'x' } }))
    await portalApi.joinResend(SIGNUP).catch(() => undefined)
    expect(useServiceStatus.getState().status).toBe('ok')
  })

  it('a successful public call clears the updating state', async () => {
    useServiceStatus.getState().report('updating', 30)
    vi.stubGlobal('fetch', answer(200, { course_id: 'c' }))
    await portalApi.joinCard(T, 'key1')
    expect(useServiceStatus.getState().status).toBe('ok')
  })
})

describe('portalApi.estimateTask (G-33 response_language)', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends response_language to FormData when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ price_units: 5, available_units: 20, enough: true, missing_units: 0, charging_enabled: true, basis: 'typical', paid_by: 'self' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const file = new File(['hi'], 'a.py', { type: 'text/plain' })
    await portalApi.estimateTask('task-1', file, 'eng')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/v1/portal/tasks/task-1/estimate')
    const fd = init.body as FormData
    expect(fd.get('file')).toBeInstanceOf(File)
    expect(fd.get('response_language')).toBe('eng')
  })

  it('omits response_language when not provided or null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ price_units: 5, available_units: 20, enough: true, missing_units: 0, charging_enabled: true, basis: 'typical', paid_by: 'self' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await portalApi.estimateTask('task-1')
    await portalApi.estimateTask('task-1', null, null)

    const fd1 = (fetchMock.mock.calls[0]![1] as RequestInit).body as FormData
    const fd2 = (fetchMock.mock.calls[1]![1] as RequestInit).body as FormData
    expect(fd1.has('response_language')).toBe(false)
    expect(fd2.has('response_language')).toBe(false)
  })
})

describe('portalApi.publicNumbers', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().setSession({
      token: 'jwt',
      tenantId: 't',
      studentId: 's',
      displayName: null,
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GETs /api/v1/public/numbers without a student token and without triggering 401 redirect', async () => {
    const payload = { contract_version: 1, packages: [], review_cost: { homework: { status: 'insufficient_data', actual: null, smallest_package_reviews: null } } }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload),
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await portalApi.publicNumbers()
    expect(res).toEqual(payload)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]
    expect(url).toContain('/api/v1/public/numbers')
    expect(init?.headers).toBeUndefined()
  })
})
