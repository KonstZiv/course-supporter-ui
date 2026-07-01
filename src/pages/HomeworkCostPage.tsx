import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Receipt, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { costApi, type CostQueryParams } from '../api/cost'
import type { HomeworkCostResponse } from '../types/api'
import { HomeworkCostTree } from '../components/cost/HomeworkCostTree'

// Homework cost-attribution view (6.HC-UI). A surface separate from
// CostPage (/cost/summary): the backend keeps homework cost out of the
// ingestion by_course breakdown (DD-6-I), and the FE mirrors that domain
// boundary with its own page + route. Renders a period total plus the
// 3-level drill tree (course → task → student), each level fetched on
// demand by `HomeworkCostTree`. State is component-local (mirrors
// CostPage — no cross-page consumers).

type Mode = 'all' | 'range'

export function HomeworkCostPage() {
  const [data, setData] = useState<HomeworkCostResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // The params the current tree was loaded with — keys the tree so a
  // range change remounts it and clears every expanded node's cache.
  const [appliedParams, setAppliedParams] = useState<CostQueryParams>({})

  const rangeInvalid =
    mode === 'range' && Boolean(dateFrom && dateTo && dateFrom > dateTo)

  const load = useCallback(async (params: CostQueryParams) => {
    setLoading(true)
    setError(null)
    try {
      setData(await costApi.homework(params))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load is all-time (no from/to → backend tenant.created_at..today).
  useEffect(() => {
    void load({})
  }, [load])

  const apply = () => {
    if (rangeInvalid) return
    const params: CostQueryParams = {}
    if (mode === 'range') {
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
    }
    setAppliedParams(params)
    void load(params)
  }

  const retry = () => {
    void load(appliedParams)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="page-title">Витрати на перевірку ДЗ</h1>
        <p className="page-subtitle">
          Вартість обробки подач за курсами, завданнями та студентами
        </p>
      </div>

      {/* Range mode toggle + optional date controls */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="inline-flex rounded-xl border border-canvas-dark overflow-hidden">
            <button
              className={clsx(
                'px-4 py-2 text-sm font-medium transition-colors',
                mode === 'all'
                  ? 'bg-navy-pale text-navy'
                  : 'text-ink-light hover:bg-canvas-dark',
              )}
              onClick={() => setMode('all')}
            >
              За весь час
            </button>
            <button
              className={clsx(
                'px-4 py-2 text-sm font-medium transition-colors',
                mode === 'range'
                  ? 'bg-navy-pale text-navy'
                  : 'text-ink-light hover:bg-canvas-dark',
              )}
              onClick={() => setMode('range')}
            >
              За період
            </button>
          </div>

          {mode === 'range' && (
            <>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Від</label>
                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">До</label>
                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}

          <button
            className="btn-primary"
            onClick={apply}
            disabled={rangeInvalid || loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Застосувати
          </button>
        </div>
        {rangeInvalid && (
          <p className="text-sm text-coral mt-3">
            Початкова дата має бути не пізніше кінцевої
          </p>
        )}
      </div>

      {/* Body: loading / error / data */}
      {loading && !data ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 size={32} className="animate-spin text-navy" />
        </div>
      ) : error ? (
        <div className="card p-8 flex flex-col items-center text-center">
          <AlertCircle size={32} className="text-coral mb-3" />
          <p className="text-ink mb-4">{error}</p>
          <button className="btn-secondary" onClick={retry}>
            <RefreshCw size={16} />
            Повторити
          </button>
        </div>
      ) : data ? (
        <>
          {/* Total */}
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-pale flex items-center justify-center">
                <Receipt size={22} className="text-amber" />
              </div>
              <div>
                <p className="text-sm text-ink-muted">Загальні витрати на ДЗ</p>
                <p className="text-3xl font-bold text-ink font-mono">
                  ${data.total_usd.toFixed(4)}
                </p>
                <p className="text-xs text-ink-muted mt-2">
                  Період: {data.from} — {data.to}
                </p>
              </div>
            </div>
          </div>

          {/* Drill tree: course → task → student */}
          <div className="card p-5">
            <h2 className="font-display text-xl text-ink mb-4">
              За курсами, завданнями та студентами
            </h2>
            <HomeworkCostTree
              key={JSON.stringify(appliedParams)}
              courses={data.by_course}
              params={appliedParams}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
