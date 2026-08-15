import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadWithProgress } from './upload'
import { ApiError } from './client'
import { rejectionDetail } from '../utils/apiError'
import { useAuthStore } from '../stores/auth'

// Controllable fake XMLHttpRequest — jsdom's own does (fake) network; here we
// drive load / error / progress by hand to assert the transport contract.
class FakeXHR {
  static instances: FakeXHR[] = []
  status = 0
  responseText = ''
  upload = { onprogress: null as ((e: ProgressEvent) => void) | null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown = null
  constructor() {
    FakeXHR.instances.push(this)
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value
  }
  send(body: unknown) {
    this.body = body
  }
}

/** The XHR the call under test just created (narrows away ``undefined``). */
function lastXhr(): FakeXHR {
  const xhr = FakeXHR.instances[FakeXHR.instances.length - 1]
  if (!xhr) throw new Error('no XHR was created')
  return xhr
}

describe('uploadWithProgress (XHR file-send transport, Е1)', () => {
  beforeEach(() => {
    FakeXHR.instances = []
    vi.stubGlobal('XMLHttpRequest', FakeXHR as unknown as typeof XMLHttpRequest)
    useAuthStore.setState({ apiKey: 'test-key' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects with the shared 401 (no XHR opened) when no key is set', async () => {
    useAuthStore.setState({ apiKey: null })
    await expect(uploadWithProgress('/p', new FormData())).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(FakeXHR.instances).toHaveLength(0)
  })

  it('sends the key header and lets the browser set the multipart boundary', () => {
    void uploadWithProgress('/api/v1/x', new FormData())
    const xhr = lastXhr()
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toContain('/api/v1/x')
    expect(xhr.headers['X-API-Key']).toBe('test-key')
    expect(xhr.headers['Content-Type']).toBeUndefined()
  })

  it('reports upload progress as loaded/total, skipping non-computable ticks', () => {
    const seen: Array<{ loaded: number; total: number }> = []
    void uploadWithProgress('/p', new FormData(), (p) => seen.push(p))
    const xhr = lastXhr()
    xhr.upload.onprogress?.({
      lengthComputable: true,
      loaded: 40,
      total: 100,
    } as ProgressEvent)
    xhr.upload.onprogress?.({
      lengthComputable: false,
      loaded: 0,
      total: 0,
    } as ProgressEvent)
    expect(seen).toEqual([{ loaded: 40, total: 100 }])
  })

  it('resolves the parsed JSON body on success', async () => {
    const p = uploadWithProgress<{ id: string }>('/p', new FormData())
    const xhr = lastXhr()
    xhr.status = 200
    xhr.responseText = JSON.stringify({ id: 'doc-1' })
    xhr.onload?.()
    await expect(p).resolves.toEqual({ id: 'doc-1' })
  })

  it('rejects with the same ApiError shape as the read path (status + parsed body)', async () => {
    const p = uploadWithProgress('/p', new FormData())
    const xhr = lastXhr()
    xhr.status = 400
    xhr.responseText = JSON.stringify({
      detail: {
        code: 'SECURITY_REJECTED',
        category: 'size',
        details: 'файл завеликий',
      },
    })
    xhr.onload?.()
    await expect(p).rejects.toBeInstanceOf(ApiError)
    // ``rejectionDetail`` is the SAME reader the read path uses — that it
    // resolves the message proves the body shape survives the XHR path (Е1).
    await p.catch((err) => {
      expect((err as ApiError).status).toBe(400)
      expect(rejectionDetail(err)).toBe('файл завеликий')
    })
  })
})
