import type { BillingStatementItem } from '../../types/api'
import { LOAD_FAILED } from '../../utils/billingWords'
import { FailureWithLetter } from './FailureWithLetter'
import { StatementList } from './StatementList'

interface StatementSectionProps {
  items: BillingStatementItem[]
  hasMore: boolean
  loadingMore: boolean
  moreFailed: boolean
  onMore: () => void
}

/** The author's movements of units, the newest first, a page at a time. */
export function StatementSection(props: StatementSectionProps) {
  return (
    <StatementList {...props} moreFailedNote={<FailureWithLetter text={LOAD_FAILED} />} />
  )
}
