import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { costApi, type CostQueryParams } from '../../api/cost'
import type {
  HomeworkByCourseEntry,
  HomeworkByStudentEntry,
  HomeworkByTaskEntry,
} from '../../types/api'

// Homework cost drill tree (6.HC-UI). Three levels, each fetched on
// first expand and cached (re-expanding never refetches):
//   course (L1 row) → tasks (L2) → students (L3, leaf).
// An empty breakdown is the norm — a node with no homework cost, or a
// foreign/unknown id (the backend returns an empty list, not a 404) —
// and renders as a placeholder, never an error. A thrown fetch (network)
// renders an inline retry. Currency mirrors the course-cost dashboard:
// `$` + `.toFixed(4)` + `font-mono`.

const money = (n: number) => `$${n.toFixed(4)}`

function EmptyChildren({ label }: { label: string }) {
  return <p className="text-ink-muted text-sm py-2 pl-8">{label}</p>
}

function BranchError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-8 text-sm">
      <span className="text-coral">{message}</span>
      <button className="text-navy hover:underline" onClick={onRetry}>
        Повторити
      </button>
    </div>
  )
}

// Lazy fetch-on-expand + cache. `data === null` means never fetched; the
// fetcher runs exactly once, on the first expand. The parent keys the whole
// tree by the applied date params, so a range change remounts and clears
// every node's cache.
function useLazyChildren<T>(fetcher: () => Promise<T>) {
  const [expanded, setExpanded] = useState(false)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next && data === null && !loading) void run()
  }

  return { expanded, data, loading, error, toggle, retry: run }
}

function RowChevron({ expanded, loading }: { expanded: boolean; loading: boolean }) {
  if (loading) return <Loader2 size={16} className="animate-spin text-navy" />
  return expanded ? (
    <ChevronDown size={16} className="text-ink-muted" />
  ) : (
    <ChevronRight size={16} className="text-ink-muted" />
  )
}

function StudentRow({ student }: { student: HomeworkByStudentEntry }) {
  return (
    <div className="flex items-center gap-2 py-2 px-2 pl-8">
      <span className="flex-1 text-ink">{student.student_display}</span>
      <span className="font-mono text-ink">{money(student.cost_usd)}</span>
    </div>
  )
}

function TaskRow({
  task,
  params,
}: {
  task: HomeworkByTaskEntry
  params: CostQueryParams
}) {
  const { expanded, data, loading, error, toggle, retry } = useLazyChildren(() =>
    costApi.homeworkTask(task.authored_document_id, params).then((r) => r.by_student),
  )
  return (
    <div>
      <button
        className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-canvas-dark/30 transition-colors"
        onClick={toggle}
      >
        <RowChevron expanded={expanded} loading={loading} />
        <span className="flex-1 text-left text-ink">
          {task.task_label}
          {task.is_deleted && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-coral-pale text-coral">
              видалено
            </span>
          )}
        </span>
        <span className="font-mono text-ink">{money(task.cost_usd)}</span>
      </button>
      {expanded &&
        (error ? (
          <BranchError message={error} onRetry={retry} />
        ) : data === null ? null : data.length === 0 ? (
          <EmptyChildren label="Немає студентів з витратами" />
        ) : (
          <div className="pl-6">
            {data.map((s) => (
              <StudentRow key={s.student_id} student={s} />
            ))}
          </div>
        ))}
    </div>
  )
}

function CourseRow({
  course,
  params,
}: {
  course: HomeworkByCourseEntry
  params: CostQueryParams
}) {
  const { expanded, data, loading, error, toggle, retry } = useLazyChildren(() =>
    costApi.homeworkCourse(course.course_node_id, params).then((r) => r.by_task),
  )
  return (
    <div>
      <button
        className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-canvas-dark/30 transition-colors"
        onClick={toggle}
      >
        <RowChevron expanded={expanded} loading={loading} />
        <span className="flex-1 text-left text-ink font-medium">
          {course.course_title}
        </span>
        <span className="font-mono text-ink">{money(course.cost_usd)}</span>
      </button>
      {expanded &&
        (error ? (
          <BranchError message={error} onRetry={retry} />
        ) : data === null ? null : data.length === 0 ? (
          <EmptyChildren label="Немає завдань з витратами" />
        ) : (
          <div className="pl-6">
            {data.map((t) => (
              <TaskRow key={t.authored_document_id} task={t} params={params} />
            ))}
          </div>
        ))}
    </div>
  )
}

export function HomeworkCostTree({
  courses,
  params,
}: {
  courses: HomeworkByCourseEntry[]
  params: CostQueryParams
}) {
  if (courses.length === 0) {
    return <p className="text-ink-muted text-sm">Немає даних за цей період</p>
  }
  return (
    <div className="divide-y divide-canvas-dark/40">
      {courses.map((c) => (
        <CourseRow key={c.course_node_id} course={c} params={params} />
      ))}
    </div>
  )
}
