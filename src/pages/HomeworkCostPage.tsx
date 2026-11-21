import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SpendingFrame } from '../components/cost/SpendingFrame'
import type { BillingSpendingCourse } from '../types/api'
import { formatNumber, formatUnits } from '../utils/units'
import { useLanguage, useT } from '../i18n/LanguageContext'

// "Витрати ДЗ": the author's spending in units tied to homework — the reviews
// of their students' work and the preparation of the tasks — by course and
// task, for a month (`GET /billing/spending`, the courses' `tasks`). Units
// only. While the platform charges no units the page says so, as before.

const CELL = 'px-3 py-2 text-end tabular-nums whitespace-nowrap'
const HEAD = 'px-3 py-2 text-end font-medium whitespace-nowrap'

function CourseTasks({ course }: { course: BillingSpendingCourse }) {
  const [open, setOpen] = useState(false)
  const language = useLanguage()
  const t = useT()
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
          {course.title ?? t('panel.cost.untitledCourse')}
        </span>
        <span className="text-ink-light text-sm">
          {t('panel.homeworkCost.spent')} {formatUnits(language, billed)}
        </span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-canvas-dark/40">
          <table className="w-full min-w-[28rem] text-sm text-ink">
            <thead className="text-ink-light">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  {t('panel.homeworkCost.table.task')}
                </th>
                <th scope="col" className={HEAD}>{t('panel.homeworkCost.table.reviews')}</th>
                <th scope="col" className={HEAD}>{t('panel.homeworkCost.table.spent')}</th>
                <th scope="col" className={HEAD}>{t('panel.homeworkCost.table.covered')}</th>
              </tr>
            </thead>
            <tbody>
              {course.tasks.map((task) => (
                <tr
                  key={task.authored_document_id}
                  className="border-t border-canvas-dark/40"
                >
                  <th scope="row" className="px-3 py-2 text-start font-normal break-words">
                    {task.title ?? t('panel.homeworkCost.untitledTask')}
                  </th>
                  <td className={CELL}>{formatNumber(language, task.reviews)}</td>
                  <td className={CELL}>{formatNumber(language, task.billed_units)}</td>
                  <td className={CELL}>{formatNumber(language, task.covered_units)}</td>
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
  const t = useT()

  return (
    <SpendingFrame
      title={t('panel.homeworkCost.title')}
      idle={
        <p className="text-ink">
          {t('panel.homeworkCost.idle')}
        </p>
      }
    >
      {(spending) => {
        const courses = spending.courses.filter((c) => c.tasks.length > 0)
        if (courses.length === 0) {
          return (
            <p className="text-ink">
              {t('panel.homeworkCost.emptyMonth')}
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
