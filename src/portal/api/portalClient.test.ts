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
