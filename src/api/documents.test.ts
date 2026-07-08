import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the fetch wrapper to break the transitive auth-store import and to
// assert the call shape (project convention — no msw).
const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}))
vi.mock('./client', () => ({
  api: { post: postMock, get: getMock },
}))

import { documentsApi } from './documents'

describe('documentsApi project-base methods (KD18 P6)', () => {
  beforeEach(() => {
    postMock.mockReset()
    getMock.mockReset()
  })

  it('attachBase POSTs multipart FormData with the file to /base', () => {
    postMock.mockResolvedValue({})
    const file = new File(['zip-bytes'], 'project.zip', {
      type: 'application/zip',
    })
    documentsApi.attachBase('doc-1', file)

    expect(postMock).toHaveBeenCalledTimes(1)
    const [url, body] = postMock.mock.calls[0] as [string, FormData]
    expect(url).toBe('/api/v1/documents/doc-1/base')
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('file')).toBe(file)
  })

  it('getBaseState GETs the author state surface', () => {
    getMock.mockResolvedValue({})
    documentsApi.getBaseState('doc-2')
    expect(getMock).toHaveBeenCalledWith('/api/v1/documents/doc-2/base')
  })

  it('getBaseManifest GETs the manifest route', () => {
    getMock.mockResolvedValue({})
    documentsApi.getBaseManifest('doc-3')
    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/documents/doc-3/base/manifest',
    )
  })
})
