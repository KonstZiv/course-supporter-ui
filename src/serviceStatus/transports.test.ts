import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api/client'
import { uploadWithProgress } from '../api/upload'
import { useAuthStore } from '../stores/auth'
import { portalApi, PortalApiError } from '../portal/api/portalClient'
import { usePortalSession } from '../portal/stores/session'
import { useServiceStatus } from './store'

const fetchMock = vi.fn()

function resetStatus() {
  useServiceStatus.setState({
    status: 'ok',
    since: null,
    retryAfter: 15,
    hasSucceeded: false,
    recoveryCount: 0,
    unsaved: false,
  })
}

describe('service status detection in transports', () => {
  beforeEach(() => {
    resetStatus()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    useAuthStore.setState({ apiKey: 'author-secret-key', connected: true })
    usePortalSession.setState({
      token: 'portal-jwt',
      tenantId: '019eda80-67ea-7060-b4c4-9dc85761690e',
      studentId: '019edaa5-1111-7000-8000-000000000001',
      displayName: 'Олена',
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('panel client (src/api/client.ts)', () => {
    it('reports updating on 503 service_updating, reads Retry-After, and keeps the API key', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ detail: 'service_updating' }), {
          status: 503,
          headers: { 'Retry-After': '25' },
        }),
      )

      await expect(api.get('/api/v1/nodes')).rejects.toBeInstanceOf(ApiError)
      expect(useServiceStatus.getState().status).toBe('updating')
      expect(useServiceStatus.getState().retryAfter).toBe(25)
      expect(useAuthStore.getState().apiKey).toBe('author-secret-key')
    })

    it('reports unreachable on TypeError and 502/504, and recovers on 200', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await expect(api.get('/api/v1/nodes')).rejects.toBeInstanceOf(TypeError)
      expect(useServiceStatus.getState().status).toBe('unreachable')

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      )
      await api.get('/api/v1/nodes')
      expect(useServiceStatus.getState().status).toBe('ok')
      expect(useServiceStatus.getState().hasSucceeded).toBe(true)

      fetchMock.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))
      await expect(api.get('/api/v1/nodes')).rejects.toBeInstanceOf(ApiError)
      expect(useServiceStatus.getState().status).toBe('unreachable')

      useServiceStatus.getState().recover()
      fetchMock.mockResolvedValueOnce(new Response('Gateway Timeout', { status: 504 }))
      await expect(api.get('/api/v1/nodes')).rejects.toBeInstanceOf(ApiError)
      expect(useServiceStatus.getState().status).toBe('unreachable')
    })
  })

  describe('panel upload (src/api/upload.ts)', () => {
    it('reports updating on 503 service_updating and unreachable on XHR onerror', async () => {
      let nextMode: 'updating' | 'error' = 'updating'
      class FakeXhr {
        status = 0
        responseText = ''
        upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null }
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        open() {}
        setRequestHeader() {}
        getResponseHeader(name: string) {
          return name === 'Retry-After' ? '30' : null
        }
        send() {
          if (nextMode === 'updating') {
            this.status = 503
            this.responseText = JSON.stringify({ detail: 'service_updating' })
            this.onload?.()
          } else {
            this.onerror?.()
          }
        }
      }
      vi.stubGlobal('XMLHttpRequest', FakeXhr)

      await expect(
        uploadWithProgress('/api/v1/upload', new FormData()),
      ).rejects.toBeInstanceOf(ApiError)
      expect(useServiceStatus.getState().status).toBe('updating')
      expect(useServiceStatus.getState().retryAfter).toBe(30)

      resetStatus()
      nextMode = 'error'
      await expect(
        uploadWithProgress('/api/v1/upload', new FormData()),
      ).rejects.toThrow('Network error while uploading')
      expect(useServiceStatus.getState().status).toBe('unreachable')
    })
  })

  describe('portal client (src/portal/api/portalClient.ts)', () => {
    it('reports updating on 503 service_updating and does NOT clear the portal session', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ detail: 'service_updating' }), {
          status: 503,
          headers: { 'Retry-After': '40' },
        }),
      )

      await expect(portalApi.courses()).rejects.toBeInstanceOf(PortalApiError)
      expect(useServiceStatus.getState().status).toBe('updating')
      expect(useServiceStatus.getState().retryAfter).toBe(40)
      expect(usePortalSession.getState().token).toBe('portal-jwt')
    })

    it('still clears the portal session on 401', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

      await expect(portalApi.courses()).rejects.toBeInstanceOf(PortalApiError)
      expect(usePortalSession.getState().token).toBeNull()
      expect(useServiceStatus.getState().status).toBe('ok')
    })

    it('reports unreachable on TypeError and 502/504, and recovers on 200', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await expect(portalApi.courses()).rejects.toBeInstanceOf(TypeError)
      expect(useServiceStatus.getState().status).toBe('unreachable')

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 }),
      )
      await portalApi.courses()
      expect(useServiceStatus.getState().status).toBe('ok')
      expect(useServiceStatus.getState().hasSucceeded).toBe(true)

      fetchMock.mockResolvedValueOnce(new Response('Bad Gateway', { status: 502 }))
      await expect(portalApi.courses()).rejects.toBeInstanceOf(PortalApiError)
      expect(useServiceStatus.getState().status).toBe('unreachable')
    })
  })
})
