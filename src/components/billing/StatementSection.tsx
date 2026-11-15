import { Loader2 } from 'lucide-react'
import type { BillingStatementItem } from '../../types/api'
import { LOAD_FAILED, statementLineText } from '../../utils/billingWords'
import {
  formatDate,
  formatNumber,
  formatSignedNumber,
  formatUnits,
} from '../../utils/units'
import { ContactAdmin } from '../ui/ContactAdmin'

interface StatementSectionProps {
  items: BillingStatementItem[]
  hasMore: boolean
  loadingMore: boolean
  moreFailed: boolean
  onMore: () => void
}

const HEAD = 'px-4 py-3 font-medium text-ink'
const CELL = 'px-4 py-3'

function UnitsCell({ line }: { line: BillingStatementItem }) {
  if (line.affects_balance) {
    return <td className={`${CELL} text-end text-ink`}>{formatSignedNumber(line.units)}</td>
  }
  // Held, freed or covered: the balance stayed as it was.
  return (
    <td className={`${CELL} text-end text-ink-light`}>
      <span title="Залишок не змінився">{formatNumber(line.units)}</span>
    </td>
  )
}

/** The author's movements of units, the newest first, a page at a time. */
export function StatementSection({
  items,
  hasMore,
  loadingMore,
  moreFailed,
  onMore,
}: StatementSectionProps) {
  return (
    <section aria-labelledby="billing-statement" className="space-y-4">
      <h2 id="billing-statement" className="font-display text-xl text-ink">
        Рухи юнітів
      </h2>
      {items.length === 0 ? (
        <p className="text-ink-light">Рухів юнітів ще немає.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-canvas-dark">
              <tr>
                <th scope="col" className={`${HEAD} text-start`}>Дата</th>
                <th scope="col" className={`${HEAD} text-start`}>Що відбулося</th>
                <th scope="col" className={`${HEAD} text-end`}>Юніти</th>
                <th scope="col" className={`${HEAD} text-end`}>Залишок після</th>
              </tr>
            </thead>
            <tbody>
              {items.map((line, i) => (
                <tr key={i} className="border-b border-canvas-dark/40 last:border-0">
                  <td className={`${CELL} whitespace-nowrap text-ink`}>
                    {formatDate(line.at)}
                  </td>
                  <td className={`${CELL} text-ink`}>{statementLineText(line)}</td>
                  <UnitsCell line={line} />
                  <td className={`${CELL} whitespace-nowrap text-end text-ink`}>
                    {formatUnits(line.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {moreFailed && (
        <div className="space-y-2">
          <p role="alert" className="text-ink">
            {LOAD_FAILED}
          </p>
          <ContactAdmin message={LOAD_FAILED} fallback="after-click" />
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          className="btn-secondary"
          disabled={loadingMore}
          onClick={onMore}
        >
          {loadingMore && <Loader2 size={16} className="animate-spin" />}
          Показати ще
        </button>
      )}
    </section>
  )
}
