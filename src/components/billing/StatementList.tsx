import { Loader2 } from 'lucide-react'
import type { BillingStatementItem } from '../../types/api'
import { useLanguage, useT } from '../../i18n/LanguageContext'
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
  const language = useLanguage()
  const t = useT()
  if (line.affects_balance) {
    return (
      <td className={`${CELL} text-end text-ink`}>
        {formatSignedNumber(language, line.units)}
      </td>
    )
  }
  // Held, freed or covered: the balance stayed as it was.
  return (
    <td className={`${CELL} text-end text-ink-light`}>
      <span title={t('shared.statement.unchanged')}>{formatNumber(language, line.units)}</span>
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
  const language = useLanguage()
  const t = useT()
  return (
    <section aria-labelledby="billing-statement" className="space-y-4">
      <h2 id="billing-statement" className="font-display text-xl text-ink">
        {t('shared.statement.title')}
      </h2>
      {items.length === 0 ? (
        <p className="text-ink-light">{t('shared.statement.empty')}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-canvas-dark">
              <tr>
                <th scope="col" className={`${HEAD} text-start`}>
                  {t('shared.statement.date')}
                </th>
                <th scope="col" className={`${HEAD} text-start`}>
                  {t('shared.statement.what')}
                </th>
                <th scope="col" className={`${HEAD} text-end`}>
                  {t('shared.statement.units')}
                </th>
                <th scope="col" className={`${HEAD} text-end`}>
                  {t('shared.statement.balanceAfter')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((line, i) => (
                <tr key={i} className="border-b border-canvas-dark/40 last:border-0">
                  <td className={`${CELL} whitespace-nowrap text-ink`}>
                    {formatDate(language, line.at)}
                  </td>
                  <td className={`${CELL} text-ink`}>{statementLineText(language, line)}</td>
                  <UnitsCell line={line} />
                  <td className={`${CELL} whitespace-nowrap text-end text-ink`}>
                    {formatUnits(language, line.balance_after)}
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
          {t('shared.statement.more')}
        </button>
      )}
    </section>
  )
}
