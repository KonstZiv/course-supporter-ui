import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { HomeworkCostPage } from './HomeworkCostPage'

// Covers the 6.HC-UI contract: all-time fetch on mount (no from/to →
// backend tenant fallback), total render, and — the load-bearing bit —
// lazy fetch-on-expand for the drill tree (L2 tasks are NOT fetched until
// the course row is expanded) plus the is_deleted marker.
vi.mock('../api/cost', () => ({
  costApi: {
    homework: vi.fn(() =>
      Promise.resolve({
        from: '2026-01-01',
        to: '2026-04-30',
        total_usd: 80.25,
        by_course: [
          { course_node_id: 'c1', course_title: 'Course Alpha', cost_usd: 55.5 },
          { course_node_id: 'c2', course_title: 'Course Beta', cost_usd: 24.75 },
        ],
      }),
    ),
    homeworkCourse: vi.fn(() =>
      Promise.resolve({
        course_node_id: 'c1',
        from: '2026-01-01',
        to: '2026-04-30',
        by_task: [
          {
            authored_document_id: 't1',
            task_label: 'hw1.pdf',
            is_deleted: false,
            cost_usd: 35,
          },
          {
            authored_document_id: 't2',
            task_label: 'deleted-hw.pdf',
            is_deleted: true,
            cost_usd: 12,
          },
        ],
      }),
    ),
    homeworkTask: vi.fn(() =>
      Promise.resolve({
        authored_document_id: 't1',
        from: '2026-01-01',
        to: '2026-04-30',
        by_student: [
          { student_id: 's1', student_display: 'Іван Порталенко', cost_usd: 30 },
        ],
      }),
    ),
  },
}))

describe('HomeworkCostPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title + total and fetches all-time on mount', async () => {
    const { costApi } = await import('../api/cost')
    render(<HomeworkCostPage />)

    expect(screen.getByText('Витрати на перевірку ДЗ')).toBeInTheDocument()
    expect(costApi.homework).toHaveBeenCalledTimes(1)
    expect(costApi.homework).toHaveBeenCalledWith({})

    await waitFor(() =>
      expect(screen.getByText('$80.2500')).toBeInTheDocument(),
    )
    expect(screen.getByText('Course Alpha')).toBeInTheDocument()
    expect(screen.getByText('Course Beta')).toBeInTheDocument()
  })

  it('lazy-loads tasks on course expand and marks deleted tasks', async () => {
    const { costApi } = await import('../api/cost')
    render(<HomeworkCostPage />)

    const courseBtn = await screen.findByRole('button', { name: /Course Alpha/ })
    // Not fetched until the row is expanded (fetch-on-expand).
    expect(costApi.homeworkCourse).not.toHaveBeenCalled()

    fireEvent.click(courseBtn)

    await waitFor(() =>
      expect(costApi.homeworkCourse).toHaveBeenCalledWith('c1', {}),
    )
    expect(await screen.findByText('hw1.pdf')).toBeInTheDocument()
    expect(screen.getByText('deleted-hw.pdf')).toBeInTheDocument()
    // is_deleted marker on the soft-deleted task.
    expect(screen.getByText('видалено')).toBeInTheDocument()
  })
})
