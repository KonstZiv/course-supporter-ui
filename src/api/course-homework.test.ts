import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}))

vi.mock('./client', () => ({
  api: { get: getMock },
}))

import { courseHomeworkApi } from './course-homework'

describe('courseHomeworkApi', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('requests summary with default include_test_students=false', () => {
    getMock.mockResolvedValue({})
    void courseHomeworkApi.summary('c-1')
    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/nodes/c-1/homework/summary?include_test_students=false',
    )
  })

  it('requests summary with include_test_students=true', () => {
    getMock.mockResolvedValue({})
    void courseHomeworkApi.summary('c-1', true)
    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/nodes/c-1/homework/summary?include_test_students=true',
    )
  })

  it('requests students table with default pagination and flag', () => {
    getMock.mockResolvedValue({})
    void courseHomeworkApi.students('c-1')
    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/nodes/c-1/homework/students?include_test_students=false&limit=500&offset=0',
    )
  })

  it('requests students table with custom params', () => {
    getMock.mockResolvedValue({})
    void courseHomeworkApi.students('c-1', {
      includeTestStudents: true,
      limit: 500,
      offset: 500,
    })
    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/nodes/c-1/homework/students?include_test_students=true&limit=500&offset=500',
    )
  })
})
