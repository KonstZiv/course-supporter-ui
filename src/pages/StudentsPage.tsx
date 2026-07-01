import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, UserPlus, Users } from 'lucide-react'
import { studentsApi } from '../api/students'
import { nodesApi } from '../api/nodes'
import type { NodeResponse, StudentRosterResponse } from '../types/api'
import { EmptyState } from '../components/ui/EmptyState'
import { StudentRow } from '../components/students/StudentRow'
import { ProvisionStudentModal } from '../components/students/ProvisionStudentModal'

const PAGE_SIZE = 20

export function StudentsPage() {
  const [resp, setResp] = useState<StudentRosterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [roots, setRoots] = useState<NodeResponse[]>([])

  const load = useCallback(async (off: number) => {
    setLoading(true)
    setError(null)
    try {
      setResp(await studentsApi.list(PAGE_SIZE, off))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(offset)
  }, [load, offset])

  // Roots once — for enrollment title mapping (StudentRow) + the bind picker.
  useEffect(() => {
    nodesApi
      .listRoots(100)
      .then((r) => setRoots(r.items))
      .catch(() => {})
  }, [])

  const titleOf = useMemo(() => {
    const map = new Map(roots.map((r) => [r.id, r.title]))
    return (id: string) => map.get(id) ?? null
  }, [roots])

  const refetch = useCallback(() => void load(offset), [load, offset])

  const total = resp?.total ?? 0
  const items = resp?.items ?? []
  const from = total === 0 ? 0 : offset + 1
  const to = offset + items.length
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Студенти</h1>
          <p className="page-subtitle">
            Доступ студентів до порталу та зарахування на курси
          </p>
        </div>
        <button className="btn-primary" onClick={() => setProvisionOpen(true)}>
          <UserPlus size={16} /> Додати студента
        </button>
      </div>

      {loading && !resp ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-navy" />
        </div>
      ) : error ? (
        <div className="card p-4 flex items-center gap-2 text-coral">
          <AlertCircle size={18} />
          {error}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={Users}
          title="Ще немає студентів"
          description="Додайте першого студента, щоб надати доступ до порталу."
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-ink-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Студент</th>
                  <th className="text-left px-4 py-3 font-medium">Логін</th>
                  <th className="text-left px-4 py-3 font-medium">Статус</th>
                  <th className="text-left px-4 py-3 font-medium">Курсів</th>
                  <th className="text-right px-4 py-3 font-medium">Дії</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <StudentRow
                    key={s.student_id}
                    student={s}
                    titleOf={titleOf}
                    onChanged={refetch}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-ink-muted">
            <span>
              Показано {from}–{to} з {total}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-ghost btn-sm"
                disabled={!canPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              >
                Назад
              </button>
              <button
                className="btn-ghost btn-sm"
                disabled={!canNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
              >
                Далі
              </button>
            </div>
          </div>
        </>
      )}

      <ProvisionStudentModal
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        onCreated={() => {
          // Newest-first roster → jump to page 1 to see the new student.
          if (offset === 0) void load(0)
          else setOffset(0)
        }}
      />
    </div>
  )
}
