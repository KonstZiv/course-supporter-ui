import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { portalApi, PortalApiError } from './portalClient'
import { usePortalSession } from '../stores/session'

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
