import type { BillingStatementItem } from '../../types/api'
import { loadFailedText } from '../../utils/authorBillingTexts'
import { FailureWithLetter } from './FailureWithLetter'
import { StatementList } from './StatementList'
import { useLanguage } from '../../i18n/LanguageContext'

interface StatementSectionProps {
  items: BillingStatementItem[]
  hasMore: boolean
  loadingMore: boolean
  moreFailed: boolean
  onMore: () => void
}

/** The author's movements of units, the newest first, a page at a time. */
export function StatementSection(props: StatementSectionProps) {
  const language = useLanguage()
  return (
    <StatementList {...props} moreFailedNote={<FailureWithLetter text={loadFailedText(language)} />} />
  )
}
