import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Copy, Loader2, UserPlus, Users } from 'lucide-react'
import { studentsApi } from '../api/students'
import { nodesApi } from '../api/nodes'
import type { NodeResponse, StudentRosterResponse } from '../types/api'
import { EmptyState } from '../components/ui/EmptyState'
import { StudentRow } from '../components/students/StudentRow'
import { ProvisionStudentModal } from '../components/students/ProvisionStudentModal'

const PAGE_SIZE = 20

// DD-6-M: origin of the portal SPA (a different app/host), used to build the
// shared login link. Empty in dev (C5 pattern, mirrors VITE_API_BASE_URL) — the
// copy button is disabled then, since a relative link would be broken.
const PORTAL_ORIGIN = import.meta.env.VITE_PORTAL_ORIGIN || ''

export function StudentsPage() {
  const [resp, setResp] = useState<StudentRosterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [provisionOpen, setProvisionOpen] = useState(false)
  const [roots, setRoots] = useState<NodeResponse[]>([])
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )

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

  // DD-6-M: one shared portal link per tenant (student identifies on the login
  // form, not in the URL). tenant_id comes from the roster payload.
  const tenantId = resp?.tenant_id ?? null
  const portalLink =
    PORTAL_ORIGIN && tenantId ? `${PORTAL_ORIGIN}/${tenantId}/login` : null

  const copyPortalLink = async () => {
    if (!portalLink) return
    try {
      await navigator.clipboard.writeText(portalLink)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // Clipboard API unavailable (insecure context / older browser) — surface
      // the link as selectable text for manual copy.
      setCopyState('failed')
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      {/* Д3: below `sm` the title and the two actions stack instead of sharing
          one justify-between row, where they collided with the subtitle and ran
          off the 320 floor; from `sm`+ the original single-row layout returns. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="page-title">Студенти</h1>
          <p className="page-subtitle">
            Доступ студентів до порталу та зарахування на курси
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <button
            className="btn-ghost"
            disabled={!portalLink}
            onClick={() => void copyPortalLink()}
            title={
              !PORTAL_ORIGIN
                ? 'Портальне посилання недоступне: не задано VITE_PORTAL_ORIGIN.'
                : undefined
            }
          >
            <Copy size={16} />
            {copyState === 'copied'
              ? 'Скопійовано!'
              : 'Скопіювати посилання порталу'}
          </button>
          <button className="btn-primary" onClick={() => setProvisionOpen(true)}>
            <UserPlus size={16} /> Додати студента
          </button>
        </div>
      </div>

      {copyState === 'failed' && portalLink && (
        <div className="card p-3 mb-4 text-sm text-ink-light">
          Не вдалося скопіювати автоматично. Скопіюйте вручну:{' '}
          <span className="select-all font-mono text-ink break-all">
            {portalLink}
          </span>
        </div>
      )}

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
          {/* Below 896 the roster clips past the card with no way to scroll to
              it (PROBE-NARROW Б1: clip from 872, both action buttons unreachable
              from ~856; page never drags). The threshold is 896 — higher than
              history's 768 because this table is data-driven and breaks earlier,
              and 896 stays under 960 (half a wide monitor, where it works and must
              show). Pure CSS via the `min-[896px]` arbitrary variant, no JS width
              measurement (Р2). Above 896 the table is byte-for-byte unchanged. */}
          <div className="card overflow-hidden hidden min-[896px]:block">
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

          {/* Honest limit shown only below 896 (Р3/Р4). Reuses EmptyState and the
              page's own empty-state icon (no apt monitor icon is already in use).
              ``hidden`` = display:none, so assistive tech never reads the table and
              this at once. The sentence names "керувати доступом" because revoke /
              reset-password / enrollment all live inside the hidden table. Verbatim
              text from RATIFIED Р4 — do not edit without re-ratification. */}
          <div className="min-[896px]:hidden">
            <EmptyState
              icon={Users}
              title="Перелік студентів потребує ширшого екрана"
              description="Ваші студенти на місці — тут просто замало місця, щоб показати їх і керувати доступом. Відкрийте цю сторінку на комп'ютері або розгорніть вікно ширше."
            />
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-ink-muted">
            <span>
              Показано {from}–{to} з {total}
            </span>
            {/* Count stays at every width (Р3); Назад/Далі hide below the threshold
                so we never page a list the author cannot see. */}
            <div className="hidden min-[896px]:flex gap-2">
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
