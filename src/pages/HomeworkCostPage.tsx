import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SpendingFrame } from '../components/cost/SpendingFrame'
import type { BillingSpendingCourse } from '../types/api'
import { formatNumber, formatUnits } from '../utils/units'
import { UNTITLED_COURSE } from './CostPage'

// "Витрати ДЗ": the author's spending in units tied to homework — the reviews
// of their students' work and the preparation of the tasks — by course and
// task, for a month (`GET /billing/spending`, the courses' `tasks`). Units
// only. While the platform charges no units the page says so, as before.

const CELL = 'px-3 py-2 text-end tabular-nums whitespace-nowrap'
const HEAD = 'px-3 py-2 text-end font-medium whitespace-nowrap'

function CourseTasks({ course }: { course: BillingSpendingCourse }) {
  const [open, setOpen] = useState(false)
  const billed = course.tasks.reduce((sum, t) => sum + t.billed_units, 0)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section className="card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-start"
      >
        <Chevron size={16} className="text-ink-light shrink-0" />
        <span className="font-medium text-ink flex-1 min-w-0 break-words">
          {course.title ?? UNTITLED_COURSE}
        </span>
        <span className="text-ink-light text-sm">
          Витрачено: {formatUnits('uk', billed)}
        </span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-canvas-dark/40">
          <table className="w-full min-w-[28rem] text-sm text-ink">
            <thead className="text-ink-light">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  Завдання
                </th>
                <th scope="col" className={HEAD}>Перевірок</th>
                <th scope="col" className={HEAD}>Витрачено</th>
                <th scope="col" className={HEAD}>Покрито</th>
              </tr>
            </thead>
            <tbody>
              {course.tasks.map((task) => (
                <tr
                  key={task.authored_document_id}
                  className="border-t border-canvas-dark/40"
                >
                  <th scope="row" className="px-3 py-2 text-start font-normal break-words">
                    {task.title ?? 'Завдання без назви'}
                  </th>
                  <td className={CELL}>{formatNumber('uk', task.reviews)}</td>
                  <td className={CELL}>{formatNumber('uk', task.billed_units)}</td>
                  <td className={CELL}>{formatNumber('uk', task.covered_units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function HomeworkCostPage() {
  return (
    <SpendingFrame
      title="Витрати на перевірку ДЗ"
      idle={
        <p className="text-ink">
          Тут будуть ваші витрати в юнітах, пов'язані з домашніми завданнями, — з
          розбивкою по курсах і завданнях. Вони з'являться, щойно платформа почне
          списувати юніти. Зараз юніти не списуються.
        </p>
      }
    >
      {(spending) => {
        const courses = spending.courses.filter((c) => c.tasks.length > 0)
        if (courses.length === 0) {
          return (
            <p className="text-ink">
              За цей місяць витрат на домашні завдання немає.
            </p>
          )
        }
        return (
          <div className="space-y-3">
            {courses.map((course) => (
              <CourseTasks key={course.course_node_id} course={course} />
            ))}
          </div>
        )
      }}
    </SpendingFrame>
  )
}
