import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, DollarSign, Loader2, RefreshCw } from 'lucide-react'
import { costApi, type CostQueryParams } from '../api/cost'
import type { CostSummaryResponse } from '../types/api'

// vision §3 KD5 / §5 Phase 0 row 0.UI: tenant-wide cost dashboard
// (MVP). Renders the post-0.7 backend's /cost/summary aggregate plus
// optional date filters. State is component-local on purpose — Q2 of
// the pre-flight discussion locked `useState` over a Zustand store
// because cost data has no cross-page consumers in this phase.
//
// Drill-down per course is deferred (Phase 1+); when that ships, the
// drill-down UI lives in its own page reading `costApi.course()`.
export function CostPage() {
  const [summary, setSummary] = useState<CostSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Backend rejects from > to with HTTP 422; we mirror the guard
  // client-side so the Apply button reflects validity without a round
  // trip. Empty string on either side disables the comparison (the
  // request will then omit that bound and fall through to the backend
  // tenant.created_at..today fallback).
  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo)

  const load = useCallback(async (params: CostQueryParams = {}) => {
    setLoading(true)
    setError(null)
    try {
      const result = await costApi.summary(params)
      setSummary(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const buildParams = (): CostQueryParams => {
    const params: CostQueryParams = {}
    if (dateFrom) params.from = dateFrom
    if (dateTo) params.to = dateTo
    return params
  }

  const apply = () => {
    if (rangeInvalid) return
    void load(buildParams())
  }

  const retry = () => {
    void load(buildParams())
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="page-title">Витрати</h1>
        <p className="page-subtitle">
          Аналітика витрат на LLM по курсах та провайдерах
        </p>
      </div>

      {/* Date range controls */}
      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-3">
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
      {loading && !summary ? (
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
      ) : summary ? (
        <>
          {/* Total summary header. Per KD5 invariant
              total_usd == sum(by_course) + unattributed_cost_usd; the
              unattributed line is shown only when > 0 to keep the
              header lean for the common attributed-only case. */}
          <div className="card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-pale flex items-center justify-center">
                <DollarSign size={22} className="text-amber" />
              </div>
              <div>
                <p className="text-sm text-ink-muted">Загальні витрати</p>
                <p className="text-3xl font-bold text-ink font-mono">
                  ${summary.total_usd.toFixed(4)}
                </p>
                {summary.unattributed_cost_usd > 0 && (
                  <p className="text-sm text-ink-light mt-1">
                    включно з ${summary.unattributed_cost_usd.toFixed(4)} без атрибуції до курсу
                  </p>
                )}
                <p className="text-xs text-ink-muted mt-2">
                  Період: {summary.from} — {summary.to}
                </p>
              </div>
            </div>
          </div>

          {/* By course */}
          <div className="card p-5 mb-6">
            <h2 className="font-display text-xl text-ink mb-4">За курсами</h2>
            {summary.by_course.length === 0 ? (
              <p className="text-ink-muted text-sm">Немає даних за цей період</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-canvas-dark">
                    <th className="text-left py-2 text-sm font-medium text-ink-light">
                      Курс
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-ink-light">
                      Витрати
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_course.map((entry) => (
                    <tr
                      key={entry.course_node_id}
                      className="border-b border-canvas-dark/40 last:border-b-0"
                    >
                      <td className="py-2 text-ink">{entry.course_title}</td>
                      <td className="py-2 text-right font-mono text-ink">
                        ${entry.cost_usd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* By provider */}
          <div className="card p-5">
            <h2 className="font-display text-xl text-ink mb-4">
              За провайдером і моделлю
            </h2>
            {summary.by_provider.length === 0 ? (
              <p className="text-ink-muted text-sm">Немає даних за цей період</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-canvas-dark">
                    <th className="text-left py-2 text-sm font-medium text-ink-light">
                      Провайдер
                    </th>
                    <th className="text-left py-2 text-sm font-medium text-ink-light">
                      Модель
                    </th>
                    <th className="text-right py-2 text-sm font-medium text-ink-light">
                      Витрати
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_provider.map((entry, i) => (
                    <tr
                      key={`${entry.provider}-${entry.model_id}-${i}`}
                      className="border-b border-canvas-dark/40 last:border-b-0"
                    >
                      <td className="py-2 text-ink">{entry.provider}</td>
                      <td className="py-2 text-ink font-mono text-sm">
                        {entry.model_id}
                      </td>
                      <td className="py-2 text-right font-mono text-ink">
                        ${entry.cost_usd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
