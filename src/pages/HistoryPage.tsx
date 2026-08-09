import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, History, Loader2 } from 'lucide-react'
import { jobsApi } from '../api/jobs'
import type { MaterialHistoryResponse } from '../types/api'
import { EmptyState } from '../components/ui/EmptyState'
import { MaterialHistoryRowExpandable } from '../components/history/MaterialHistoryRowExpandable'

// The page's own page size — the call decides the amount, the client bakes none
// (step Г c3). Expansion (c6) asks the same door for a different amount.
const PAGE_SIZE = 20

export function HistoryPage() {
  const [resp, setResp] = useState<MaterialHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)

  const load = useCallback(async (off: number) => {
    setLoading(true)
    setError(null)
    try {
      setResp(await jobsApi.history(PAGE_SIZE, off))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(offset)
  }, [load, offset])

  // The list can shorten between requests, leaving the offset past the end — a
  // blank screen over a non-empty history. Defined behavior: jump to the last
  // page that still exists (§3 c5, clarification 4). The jumped-to offset is
  // internal navigation, never a number shown to the author; the offset only ever
  // decreases, so this cannot loop.
  useEffect(() => {
    if (resp && resp.items.length === 0 && resp.total > 0 && offset > 0) {
      const lastOffset = Math.max(
        0,
        (Math.ceil(resp.total / PAGE_SIZE) - 1) * PAGE_SIZE,
      )
      if (offset > lastOffset) setOffset(lastOffset)
    }
  }, [resp, offset])

  const now = Date.now()
  const total = resp?.total ?? 0
  const items = resp?.items ?? []
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="page-title">Історія матеріалів</h1>
        <p className="page-subtitle">
          Що відбувалося з вашими матеріалами — від найновішого
        </p>
      </div>

      {loading && !resp ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-navy" />
        </div>
      ) : error ? (
        <div className="card p-4">
          <div className="flex items-center gap-2 text-coral mb-3">
            <AlertCircle size={18} />
            {error}
          </div>
          <button className="btn-ghost btn-sm" onClick={() => void load(offset)}>
            Повторити
          </button>
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon={History}
          title="Історія порожня"
          description="Тут відображатиметься історія ваших матеріалів."
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            {/* ``table-fixed`` + an explicit colgroup (Г9): auto-layout piled the
                whole slack into the single free column (material, ~40%), so a short
                name sat ~400px from its state chip. The three left columns get FIXED
                widths — material bound near the longest name, so a name and its state
                chip read as one group at every width instead of the column stretching
                with the viewport; the two right columns stay flexible and soak up the
                slack. The chip keeps its own column (c8 alignment intact). */}
            <table className="w-full table-fixed text-sm">
              {/* Columns, in order: Матеріал (fixed, bound near the longest name so
                  it never stretches with the viewport), Стан (chip), Остання робота
                  (flexible), Робіт (fixed count), Активність (flexible). The two
                  flexible columns absorb the slack — it never piles up between a name
                  and its chip. NB: no text nodes inside colgroup (whitespace between
                  <col> triggers a hydration warning), so comments stay out here. */}
              <colgroup>
                <col className="w-[14rem]" />
                <col className="w-[8.5rem]" />
                <col />
                <col className="w-16" />
                <col />
              </colgroup>
              <thead className="bg-canvas text-ink-muted text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Матеріал</th>
                  <th className="text-left px-4 py-3 font-medium">Стан</th>
                  <th className="text-left px-4 py-3 font-medium">
                    Остання робота
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Робіт</th>
                  <th className="text-left px-4 py-3 font-medium">Активність</th>
                </tr>
              </thead>
              {/* Keyed by offset so a page change remounts every row — the
                  expansion state (and its cached work-list) resets with the page
                  (c6): a cached list never outlives the page it was fetched for. */}
              <tbody key={offset}>
                {items.map((it) => (
                  <MaterialHistoryRowExpandable
                    key={it.material_id}
                    item={it}
                    now={now}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-ink-muted">
            {/* Count straight from the response — never a client-computed number
                (Р4: the number the author eye-checks must reconcile). */}
            <span>Матеріалів: {total}</span>
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
    </div>
  )
}
