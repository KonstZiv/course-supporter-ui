import { describe, it, expect, vi, beforeEach } from 'vitest'

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}))
vi.mock('./client', () => ({
  api: { post: postMock, get: getMock },
}))

import { enrollmentLinkApi } from './enrollment-link'

describe('enrollmentLinkApi (O-3)', () => {
  beforeEach(() => {
    postMock.mockReset()
    getMock.mockReset()
  })

  it('reads the link of the course', () => {
    getMock.mockResolvedValue({ open: false, key: null, url: null })
    void enrollmentLinkApi.get('c-1')
    expect(getMock).toHaveBeenCalledWith('/api/v1/nodes/c-1/enrollment-link')
  })

  it.each([
    ['open', '/api/v1/nodes/c-1/enrollment-link/open'],
    ['rotate', '/api/v1/nodes/c-1/enrollment-link/rotate'],
    ['close', '/api/v1/nodes/c-1/enrollment-link/close'],
  ] as const)('%s posts to its route without a body', (name, path) => {
    postMock.mockResolvedValue({ open: true, key: 'k', url: 'u' })
    void enrollmentLinkApi[name]('c-1')
    expect(postMock).toHaveBeenCalledWith(path)
  })
})
