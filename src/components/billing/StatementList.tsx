import { Loader2 } from 'lucide-react'
import type { BillingStatementItem } from '../../types/api'
import { statementLineText } from '../../utils/billingWords'
import {
  formatDate,
  formatNumber,
  formatSignedNumber,
  formatUnits,
} from '../../utils/units'

export interface StatementListProps {
  items: BillingStatementItem[]
  hasMore: boolean
  loadingMore: boolean
  moreFailed: boolean
  onMore: () => void
  /** The next page did not load: the sentence and the way to write, each app its own. */
  moreFailedNote: React.ReactNode
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

/**
 * The holder's movements of units, the newest first, a page at a time.
 * Shared by the author's section (`StatementSection`) and the student's
 * (portal).
 */
export function StatementList({
  items,
  hasMore,
  loadingMore,
  moreFailed,
  onMore,
  moreFailedNote,
}: StatementListProps) {
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
      {moreFailed && <div className="space-y-2">{moreFailedNote}</div>}
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
