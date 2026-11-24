import { describe, expect, it, vi, beforeEach } from 'vitest'
import { studentsApi } from './students'
import { api } from './client'

vi.mock('./client', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public body?: unknown,
    ) {
      super(message)
    }
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('studentsApi submissions routes', () => {
  it('calls submissions with limit, offset, and optional course_node_id', async () => {
    vi.mocked(api.get).mockResolvedValue({
      student: { student_id: 's1', display_name: null, login: null },
      enrollments: [],
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    })

    await studentsApi.submissions('s1', { limit: 20, offset: 0 })
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/students/s1/submissions?limit=20&offset=0',
    )

    await studentsApi.submissions('s1', {
      courseNodeId: 'c1',
      limit: 20,
      offset: 40,
    })
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/students/s1/submissions?course_node_id=c1&limit=20&offset=40',
    )
  })

  it('calls submission detail and file routes', async () => {
    vi.mocked(api.get).mockResolvedValue({})

    await studentsApi.submission('s1', 'sub1')
    expect(api.get).toHaveBeenCalledWith('/api/v1/students/s1/submissions/sub1')

    await studentsApi.submissionFile('s1', 'sub1')
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/students/s1/submissions/sub1/file',
    )
  })
})
